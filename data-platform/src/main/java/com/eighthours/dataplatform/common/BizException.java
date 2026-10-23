package com.eighthours.dataplatform.common;

import lombok.Getter;

/** 业务异常，携带 HTTP 状态码，由全局异常处理器统一转成 Result 返回 */
@Getter
public class BizException extends RuntimeException {

    private final int status;

    public BizException(int status, String message) {
        super(message);
        this.status = status;
    }

    public static BizException forbidden(String message) {
        return new BizException(403, message);
    }

    public static BizException notFound(String message) {
        return new BizException(404, message);
    }

    public static BizException conflict(String message) {
        return new BizException(409, message);
    }

    public static BizException unprocessable(String message) {
        return new BizException(422, message);
    }
}
