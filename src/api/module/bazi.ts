import http from "../index";

// 获取八字信息
export const getBaziInfo = (dto: any) => {
    return http.post('home/pillarData', dto, {})
}

