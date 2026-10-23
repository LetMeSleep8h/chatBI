package com.eighthours.dataplatform.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/**")
                // auth 与文档接口免鉴权
                .excludePathPatterns("/auth/**", "/doc.html", "/swagger-ui/**",
                        "/v3/api-docs/**", "/webjars/**", "/favicon.ico", "/error");
    }
}
