package com.sample.ecommerce.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.ecommerce.cart.CartItemRepository;
import com.sample.ecommerce.cart.CartRepository;
import com.sample.ecommerce.catalog.ProductRepository;
import com.sample.ecommerce.common.ApiException;
import com.sample.ecommerce.order.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class DemoResetServiceTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;

    @Test
    void resetWhenDisabledThrowsForbiddenAndTouchesNothing() {
        DemoResetService service = new DemoResetService(
                false,
                new ObjectMapper(),
                cartRepository,
                cartItemRepository,
                orderRepository,
                productRepository
        );

        assertThatThrownBy(service::reset)
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(api.getCode()).isEqualTo("DEMO_RESET_DISABLED");
                });

        verifyNoInteractions(cartRepository, cartItemRepository, orderRepository, productRepository);
        verify(orderRepository, never()).findAll();
    }
}
