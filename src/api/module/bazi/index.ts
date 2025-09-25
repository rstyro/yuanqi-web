import http from "../../index";
import {BaziQuery} from "./types";

// 获取八字信息
export const getBaziInfo = (dto: BaziQuery) => {
    return http.post('home/pillarData', dto, {})
}

