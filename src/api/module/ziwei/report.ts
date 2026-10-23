/**
 * 紫微详细报告接口（后端 `/chat/ziwei/report/**`）。
 *
 * 与八字报告同构，但归属另一张表、另一套章节（盘面详批）。
 * JSON 接口走 axios 实例，PDF 走原生 fetch —— 二进制响应体没有 `code` 信封，
 * 走拦截器会被误判成业务错误。
 *
 * 请求里没有 userId：服务端一律按 token 里的登录用户过滤。
 */
import http from '@/api';
import type {
    ZiweiPageVo,
    ZiweiReportDetailVo,
    ZiweiReportGenerateParams,
    ZiweiReportStatusVo,
    ZiweiReportVo,
} from './types';
import {useUserInfoStore} from '@/store/userInfo';
import {HTTP_UNAUTHORIZED, NeedLoginError} from '@/utils/auth';

/** 建单即返回，生成在后台跑。返回的 reportId 是字符串（后端 Long 全局序列化） */
export const generateZiweiReport = (params: ZiweiReportGenerateParams) => {
    return http.post<string>('chat/ziwei/report/generate', params);
};

/** 我的紫微报告列表，按创建时间倒序；只读主单轻字段（后端封顶 size 50） */
export const listZiweiReports = (pageNum = 1, pageSize = 10) => {
    return http.get<ZiweiPageVo<ZiweiReportVo>>('chat/ziwei/report/list', {
        params: {pageNum, pageSize},
    });
};

/** 报告详情。未生成完也返回：已完成章节能看，失败节带原因 */
export const getZiweiReportDetail = (id: string | number) => {
    return http.get<ZiweiReportDetailVo>(`chat/ziwei/report/${id}`);
};

/** 轻量状态轮询：进度计数 + 当前章节标题，不碰正文 */
export const getZiweiReportStatus = (id: string | number) => {
    return http.get<ZiweiReportStatusVo>(`chat/ziwei/report/${id}/status`);
};

/** 失败节重新入队。true = 有节被复活（整单失败态也会拖回生成中） */
export const retryZiweiReport = (id: string | number) => {
    return http.post<boolean>(`chat/ziwei/report/${id}/retry`);
};

/** 从 Content-Disposition 里取 RFC 5987 文件名；取不到返回 null */
function filenameFromDisposition(header: string | null): string | null {
    if (!header) return null;
    const m = /filename\*=(?:UTF-8|utf-8)''([^;]+)/.exec(header);
    if (!m) return null;
    try {
        return decodeURIComponent(m[1].trim());
    } catch {
        return null;
    }
}

/** PDF 端点的 4xx/5xx 都带 JSON body，读出其中的人话原因 */
async function readFailMsg(resp: Response): Promise<string> {
    try {
        const data = await resp.json();
        return data?.msg || `HTTP ${resp.status}`;
    } catch {
        return `HTTP ${resp.status} ${resp.statusText}`;
    }
}

/**
 * 下载紫微报告 PDF（后端渲染，前端只落盘）。
 *
 * 仅全部章节完成后可导 —— 未完成时后端回 400 + JSON 原因，原样抛出。
 * 文件名优先取后端给的，拿不到再本地拼。
 */
export async function downloadZiweiReportPdfById(id: string | number): Promise<string> {
    const token = useUserInfoStore().getToken;
    const base = import.meta.env.VITE_API_BASE_URL ?? '/';
    const url = `${base.endsWith('/') ? base : base + '/'}chat/ziwei/report/${id}/report.pdf`;

    const resp = await fetch(url, {headers: token ? {token} : {}});

    if (resp.status === HTTP_UNAUTHORIZED) {
        throw new NeedLoginError();
    }
    if (!resp.ok) {
        throw new Error(await readFailMsg(resp));
    }

    const blob = await resp.blob();
    const filename =
        filenameFromDisposition(resp.headers.get('Content-Disposition')) ??
        `紫微报告-${id}.pdf`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // 立刻 revoke 在部分旧浏览器里会掐断下载，拖一会儿再放
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    return filename;
}
