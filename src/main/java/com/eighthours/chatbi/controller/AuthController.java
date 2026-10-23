package com.eighthours.chatbi.controller;

import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.dto.Dtos;
import com.eighthours.chatbi.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;


    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody Dtos.RegisterReq req) {
        authService.register(req.getName(), req.getPassword());
        return Result.ok();
    }


    @PostMapping("/login")
    public Result<Dtos.LoginResp> login(@Valid @RequestBody Dtos.LoginReq req) {
        return Result.ok(authService.login(req.getName(), req.getPassword()));
    }
}
