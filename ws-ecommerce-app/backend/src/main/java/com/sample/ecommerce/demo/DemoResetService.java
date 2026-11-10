package com.sample.ecommerce.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.ecommerce.cart.Cart;
import com.sample.ecommerce.cart.CartItemRepository;
import com.sample.ecommerce.cart.CartRepository;
import com.sample.ecommerce.catalog.Product;
import com.sample.ecommerce.catalog.ProductRepository;
import com.sample.ecommerce.common.ApiException;
import com.sample.ecommerce.order.OrderRepository;
import com.sample.ecommerce.order.ShopOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DemoResetService {

    private final boolean enabled;
    private final ObjectMapper objectMapper;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public DemoResetService(
            @Value("${app.demo-reset-enabled:true}") boolean enabled,
            ObjectMapper objectMapper,
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            OrderRepository orderRepository,
            ProductRepository productRepository) {
        this.enabled = enabled;
        this.objectMapper = objectMapper;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public DemoResetResponse reset() throws Exception {
        if (!enabled) {
            throw new ApiException(HttpStatus.FORBIDDEN, "DEMO_RESET_DISABLED", "Demo reset is disabled");
        }

        List<ShopOrder> orders = orderRepository.findAll();
        orderRepository.deleteAll(orders);

        cartItemRepository.deleteAll();
        List<Cart> carts = cartRepository.findAll();
        for (Cart cart : carts) {
            cart.setPromoCode(null);
        }
        cartRepository.saveAll(carts);

        JsonNode root = objectMapper.readTree(new ClassPathResource("catalog/products.json").getInputStream());
        int restored = 0;
        for (JsonNode productNode : root.get("products")) {
            String sku = productNode.get("sku").asText();
            Product product = productRepository.findBySku(sku).orElse(null);
            if (product != null) {
                product.setStockQuantity(productNode.get("stockQuantity").asInt());
                productRepository.save(product);
                restored++;
            }
        }

        return new DemoResetResponse(true, restored, "Demo data reset. Demo user retained.");
    }

    public record DemoResetResponse(boolean ok, int productsRestored, String message) {
    }
}
