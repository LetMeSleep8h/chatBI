package com.eighthours.dataplatform.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expireHours;

    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expire-hours}") long expireHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expireHours = expireHours;
    }

    /** 签发 token，payload 含 user_id 与 role */
    public String issue(long userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claim("user_id", userId)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expireHours * 3600)))
                .signWith(key)
                .compact();
    }

    /** 校验并解析 token，非法或过期抛 BizException(401) */
    @SuppressWarnings("unchecked")
    public AuthContext.CurrentUser parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            return new AuthContext.CurrentUser(
                    ((Number) claims.get("user_id")).longValue(),
                    (String) claims.get("role"));
        } catch (Exception e) {
            throw new BizException(401, "token 无效或已过期");
        }
    }
}
