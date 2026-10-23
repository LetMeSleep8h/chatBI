package com.eighthours.dataplatform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.dataplatform.common.BizException;
import com.eighthours.dataplatform.common.JwtUtil;
import com.eighthours.dataplatform.dto.Dtos;
import com.eighthours.dataplatform.entity.User;
import com.eighthours.dataplatform.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;

    /** 注册：默认角色 operator，用户名唯一，冲突 409 */
    public void register(String name, String password) {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getName, name));
        if (count > 0) {
            throw BizException.conflict("用户名已存在: " + name);
        }
        User user = new User();
        user.setName(name);
        user.setPasswordHash(hash(password));
        user.setRole("operator");
        userMapper.insert(user);
    }

    /** 登录：成功返回 token + name + role */
    public Dtos.LoginResp login(String name, String password) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getName, name));
        if (user == null || !user.getPasswordHash().equals(hash(password))) {
            throw new BizException(401, "用户名或密码错误");
        }
        Dtos.LoginResp resp = new Dtos.LoginResp();
        resp.setToken(jwtUtil.issue(user.getId(), user.getRole()));
        resp.setName(user.getName());
        resp.setRole(user.getRole());
        return resp;
    }

    /** MVP 使用 SHA-256 摘要（不含盐），生产环境建议 BCrypt 等慢哈希 */
    private String hash(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(password.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
