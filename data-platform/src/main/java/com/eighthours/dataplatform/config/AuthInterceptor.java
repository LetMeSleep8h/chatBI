package com.eighthours.dataplatform.config;

import com.eighthours.dataplatform.common.AuthContext;
import com.eighthours.dataplatform.common.BizException;
import com.eighthours.dataplatform.common.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT 鉴权拦截器：解析 token，把当前用户放入 ThreadLocal 供业务代码读取。
 * <p>
 * 必须在 afterCompletion 中调用 AuthContext.clear()：
 * Tomcat 使用线程池复用工作线程，ThreadLocal 不清理会导致
 * 1) 当前用户的身份泄漏给同线程处理的下一个请求（越权风险）
 * 2) 内存泄漏。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new BizException(401, "缺少 token，请先登录");
        }
        AuthContext.set(jwtUtil.parse(auth.substring(7)));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // 请求结束必须清理 ThreadLocal，防止线程复用导致的身份串用与内存泄漏
        AuthContext.clear();
    }
}
