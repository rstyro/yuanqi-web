import axios, {AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig} from "axios";
import { useUserInfoStore } from '@/store/userInfo';
import { CustomRequestConfig,ApiResponse } from '@/api/types';
import {ElMessage} from "element-plus";
import {goLogin, isNeedLogin, NeedLoginError} from '@/utils/auth';

// axios 配置
const config: AxiosRequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    // 定义请求超时时间
    timeout: 60000,
    // 请求带上 cookie
    withCredentials: true,
    // 定义消息头
    headers: {
        "Content-Type": "application/json; charset=utf-8",
    }
}
// 创建 axios 实例
const http = axios.create(config);

// 存储取消请求的控制器 Map
const cancelRequestControllerMap = new Map<string, AbortController>();

// 定义请求拦截
http.interceptors.request.use(
    (config:CustomRequestConfig) => {
        // 确保 headers 存在
        config.headers = config.headers || {};

        const userInfoStore = useUserInfoStore();
        const token = userInfoStore.getToken;
        const uid = userInfoStore.getUid;
        if (token) {
            config.headers['token'] = token;
        }
        if (uid) {
            config.headers['uid'] = uid;
        }

        // 为当前请求创建 AbortController 用于取消请求
        const controller = new AbortController();
        config.signal = controller.signal;

        // 生成请求标识符 (可根据需要调整生成逻辑)
        const requestId = config.requestId || `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;
        config.requestId = requestId;

        // 如果已有相同请求，取消前一个
        if (cancelRequestControllerMap.has(requestId)) {
            cancelRequestControllerMap.get(requestId)?.abort(`Cancel repeated request: ${requestId}`);
        }
        cancelRequestControllerMap.set(requestId, controller);

        // 添加请求时间戳防止缓存
        config.params = { ...config.params, _t: new Date().getTime() };

        return config;
    },
    (error) => {
        console.error('Request configuration error:', error);
        ElMessage.error('请求失败，请检查你的参数!');
        Promise.reject(error);
    }
)

// 请求返回拦截
http.interceptors.response.use(
    (response:AxiosResponse<ApiResponse>) => {
        const res: ApiResponse = response.data;

        const config: CustomRequestConfig = response.config;
        const requestId = config.requestId;

        // 请求完成，从 cancelRequestControllerMap 中移除
        if (requestId) {
            cancelRequestControllerMap.delete(requestId);
            console.log("请求完成-删除requestid=",requestId);
        }

        //  code === 200 表示成功
        if (res.code !== 200) {
            // 未登录 / 登录已过期：清掉本地登录态并跳登录页。
            // 判据统一放在 utils/auth.ts —— 同一个信号还有另外两条链路（SSE 的 fetch、
            // 路由守卫）要认，散着写迟早会漏。
            if (isNeedLogin(response.status, res.code)) {
                ElMessage.warning('登录状态已过期，请重新登录');
                goLogin();
                // 拒绝 Promise，阻止后续 then 执行
                return Promise.reject(new NeedLoginError(res.msg));
            }
            // 其他业务错误，根据配置决定是否显示错误消息
            const showError = config.showError !== false; // 默认为 true
            if (showError) {
                ElMessage.error(res.msg || `Request error (Code: ${res.code})`);
            }
            return Promise.reject(new Error(res.msg || `Business Error Code: ${res.code}`));
        }

        // 响应数据
        return res;
    },
    async (error:AxiosError) => {
        const config: CustomRequestConfig | undefined = error.config;
        const requestId = config?.requestId;

        if (requestId) {
            console.log("请求错误-删除requestid=",requestId);
            cancelRequestControllerMap.delete(requestId);
        }

        // 如果是取消的请求，不需要报错和重试
        if (axios.isCancel(error)) {
            console.log('Request canceled:', error.message);
            return Promise.reject(error);
        }

        // 未登录 / 登录已过期。注意这条分支必须在下面的「网络错误」之前 ——
        // /graph/** 的登录闸门回的是 **401 带响应体**，走的是这个 error 分支
        // （axios 默认把非 2xx 判为 error），而不是上面那个 code !== 200 的分支。
        if (isNeedLogin(error.response?.status, (error.response?.data as ApiResponse | undefined)?.code)) {
            ElMessage.warning('登录状态已过期，请重新登录');
            goLogin();
            return Promise.reject(new NeedLoginError());
        }

        // 网络错误或无响应
        if (!error.response) {
            ElMessage.error('Network error, please check your connection.');
            return Promise.reject(error);
        }

        let errorMessage = '请求失败，请稍后再试';
        // 显示HTTP错误消息
        ElMessage.error(errorMessage);
        return Promise.reject(error);
    }
)

export default http;
