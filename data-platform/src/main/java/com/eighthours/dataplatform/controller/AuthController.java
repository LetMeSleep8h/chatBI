package com.eighthours.dataplatform.controller;

import com.eighthours.dataplatform.common.Result;
import com.eighthours.dataplatform.dto.Dtos;
import com.eighthours.dataplatform.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "认证")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "注册（默认角色 operator）")
    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody Dtos.RegisterReq req) {
        authService.register(req.getName(), req.getPassword());
        return Result.ok();
    }

    @Operation(summary = "登录，返回 token")
    @PostMapping("/login")
    public Result<Dtos.LoginResp> login(@Valid @RequestBody Dtos.LoginReq req) {
        return Result.ok(authService.login(req.getName(), req.getPassword()));
    }
}
