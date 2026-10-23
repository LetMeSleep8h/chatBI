package com.eighthours.dataplatform.common;

/** 当前登录用户上下文（由拦截器写入，业务代码读取） */
public class AuthContext {

    public record CurrentUser(long userId, String role) {
    }

    private static final ThreadLocal<CurrentUser> HOLDER = new ThreadLocal<>();

    public static void set(CurrentUser user) {
        HOLDER.set(user);
    }

    public static CurrentUser get() {
        return HOLDER.get();
    }

    public static long userId() {
        CurrentUser u = HOLDER.get();
        if (u == null) {
            throw new BizException(401, "未登录");
        }
        return u.userId();
    }

    public static String role() {
        CurrentUser u = HOLDER.get();
        if (u == null) {
            throw new BizException(401, "未登录");
        }
        return u.role();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
