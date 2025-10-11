import { AxiosResponse, InternalAxiosRequestConfig} from "axios";

// 定义统一的响应数据结构，这需要与后端约定一致
export interface ApiResponse<T = any> extends AxiosResponse{
    code: number;
    data: T;
    msg: string;
    trackerId: string;
    extendMap?: Map<string, object>;
    [key: string]: any; // 用于兼容可能存在的其他字段
}

// 扩展 AxiosRequestConfig，加入自定义配置选项
export interface CustomRequestConfig  extends InternalAxiosRequestConfig  {
    showError?: boolean; // 是否显示错误提示
    requestId?: string; // 可选请求ID，用于取消或缓存
}