package com.sample.ecommerce.order;

import com.sample.ecommerce.auth.User;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/checkout")
    public OrderDtos.OrderResponse checkout(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody OrderDtos.CheckoutRequest request) {
        return orderService.checkout(user, request);
    }

    @GetMapping("/orders")
    public List<OrderDtos.OrderResponse> orders(@AuthenticationPrincipal User user) {
        return orderService.listOrders(user);
    }

    @GetMapping("/orders/{id}")
    public OrderDtos.OrderResponse order(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return orderService.getOrder(user, id);
    }

    @PostMapping("/orders/{id}/cancel")
    public OrderDtos.OrderResponse cancel(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return orderService.cancelOrder(user, id);
    }
}
