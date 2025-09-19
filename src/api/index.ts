import axios, {AxiosRequestConfig, AxiosResponse,AxiosError} from "axios";
import { useUserInfoStore } from '@/store/userInfo.ts';

// 定义统一的响应数据结构，这需要与后端约定一致
interface ApiResponse<T = any> {
    code: number;
    data: T;
    msg: string;
    trackerId: string;
    extendMap?: Map<string, object>;
    [key: string]: any; // 用于兼容可能存在的其他字段
}

// 扩展 AxiosRequestConfig，加入自定义配置选项
interface CustomRequestConfig  extends AxiosRequestConfig {
    showError?: boolean; // 是否显示错误提示
    requestId?: string; // 可选请求ID，用于取消或缓存
}


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
            // 可以在这里处理特定的业务错误码
            // 例如 token 过期 (假设 401 表示 token 过期)
            if (res.code === 401) {
                const userInfoStore = useUserInfoStore();
                userInfoStore.clearUserInfo(); // 清除用户信息
                ElMessageBox.confirm('登录状态已过期，请重新登录', '确认退出', {
                    confirmButtonText: '重新登录',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    window.location.reload(); // 刷新页面或跳转到登录页
                }).catch(() => {
                    // 用户取消操作
                });
                // 拒绝 Promise，阻止后续 then 执行
                return Promise.reject(new Error(res.msg || `Authentication failed (Code: ${res.code})`));
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
