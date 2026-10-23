package com.eighthours.chatbi.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.eighthours.chatbi.entity.User;
import com.eighthours.chatbi.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 启动时初始化默认账号（已存在则跳过）：
 * admin/admin123（reviewer 权限）、operator1/operator123（operator）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;

    @Override
    public void run(String... args) throws Exception {
        seed("admin", "admin123", "reviewer");
        seed("operator1", "operator123", "operator");
    }

    private void seed(String name, String password, String role) throws NoSuchAlgorithmException {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getName, name));
        if (count > 0) {
            return;
        }
        User user = new User();
        user.setName(name);
        user.setPasswordHash(sha256(password));
        user.setRole(role);
        userMapper.insert(user);
        log.info("初始化默认账号: {} / {} ({})", name, password, role);
    }

    private String sha256(String password) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(password.getBytes(StandardCharsets.UTF_8)));
    }
}
