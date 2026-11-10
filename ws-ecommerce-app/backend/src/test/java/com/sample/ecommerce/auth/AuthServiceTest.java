package com.sample.ecommerce.auth;

import com.sample.ecommerce.common.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerDuplicateUsernameThrowsUsernameTaken() {
        when(userRepository.existsByUsername("demo")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(new AuthDtos.RegisterRequest("demo", "password1", "Demo")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(api.getCode()).isEqualTo("USERNAME_TAKEN");
                });

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerBlankDisplayNameFallsBackToUsername() {
        when(userRepository.existsByUsername("ada")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("hashed");
        when(jwtService.generateToken(any(User.class))).thenReturn("token-123");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(7L);
            return user;
        });

        AuthDtos.AuthResponse response = authService.register(new AuthDtos.RegisterRequest("ada", "password1", "  "));

        assertThat(response.username()).isEqualTo("ada");
        assertThat(response.displayName()).isEqualTo("ada");
        assertThat(response.token()).isEqualTo("token-123");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getDisplayName()).isEqualTo("ada");
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed");
    }

    @Test
    void loginUnknownUserThrowsUnauthorized() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("ghost", "password1")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(api.getCode()).isEqualTo("UNAUTHORIZED");
                    assertThat(api.getMessage()).isEqualTo("Invalid username or password");
                });
    }

    @Test
    void loginPasswordMismatchThrowsUnauthorized() {
        User user = new User();
        user.setId(1L);
        user.setUsername("demo");
        user.setPasswordHash("hashed");
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("demo", "wrong")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(api.getCode()).isEqualTo("UNAUTHORIZED");
                    assertThat(api.getMessage()).isEqualTo("Invalid username or password");
                });
    }

    @Test
    void loginSuccessReturnsToken() {
        User user = new User();
        user.setId(1L);
        user.setUsername("demo");
        user.setDisplayName("Demo User");
        user.setPasswordHash("hashed");
        when(userRepository.findByUsername("demo")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password1", "hashed")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token");

        AuthDtos.AuthResponse response = authService.login(new AuthDtos.LoginRequest("demo", "password1"));

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.username()).isEqualTo("demo");
        assertThat(response.displayName()).isEqualTo("Demo User");
        verify(jwtService).generateToken(user);
    }

    @Test
    void meReturnsUserProfile() {
        User user = new User();
        user.setId(3L);
        user.setUsername("ada");
        user.setDisplayName("Ada");

        AuthDtos.MeResponse me = authService.me(user);

        assertThat(me.id()).isEqualTo(3L);
        assertThat(me.username()).isEqualTo("ada");
        assertThat(me.displayName()).isEqualTo("Ada");
    }
}
