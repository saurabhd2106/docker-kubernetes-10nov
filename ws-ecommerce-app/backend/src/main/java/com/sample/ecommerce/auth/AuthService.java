package com.sample.ecommerce.auth;

import com.sample.ecommerce.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username is already taken");
        }
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName() == null || request.displayName().isBlank()
                ? username
                : request.displayName().trim());
        userRepository.save(user);
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid username or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid username or password");
        }
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthDtos.MeResponse me(User user) {
        return new AuthDtos.MeResponse(user.getId(), user.getUsername(), user.getDisplayName());
    }

    private AuthDtos.AuthResponse toAuthResponse(User user) {
        return new AuthDtos.AuthResponse(jwtService.generateToken(user), user.getUsername(), user.getDisplayName());
    }
}
