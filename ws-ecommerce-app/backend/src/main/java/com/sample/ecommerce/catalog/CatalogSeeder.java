package com.sample.ecommerce.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sample.ecommerce.auth.User;
import com.sample.ecommerce.auth.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogSeeder.class);

    private final ObjectMapper objectMapper;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CatalogSeeder(
            ObjectMapper objectMapper,
            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.objectMapper = objectMapper;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        seedDemoUser();
        JsonNode root = objectMapper.readTree(new ClassPathResource("catalog/products.json").getInputStream());

        if (productRepository.count() == 0) {
            for (JsonNode categoryNode : root.get("categories")) {
                Category category = new Category();
                category.setName(categoryNode.get("name").asText());
                category.setSlug(categoryNode.get("slug").asText());
                categoryRepository.save(category);
            }

            for (JsonNode productNode : root.get("products")) {
                saveProduct(productNode);
            }
            log.info("Seeded {} categories and {} products", categoryRepository.count(), productRepository.count());
        } else {
            int added = 0;
            for (JsonNode productNode : root.get("products")) {
                String sku = productNode.get("sku").asText();
                if (!productRepository.existsBySku(sku)) {
                    saveProduct(productNode);
                    added++;
                }
            }
            if (added > 0) {
                log.info("Seeded {} missing catalog products", added);
            } else {
                log.info("Catalog already seeded ({} products)", productRepository.count());
            }
        }
    }

    private void saveProduct(JsonNode productNode) {
        String slug = productNode.get("categorySlug").asText();
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalStateException("Missing category " + slug));
        Product product = new Product();
        product.setCategory(category);
        product.setSku(productNode.get("sku").asText());
        product.setName(productNode.get("name").asText());
        product.setDescription(productNode.get("description").asText());
        product.setPriceCents(productNode.get("priceCents").asInt());
        product.setImagePath(productNode.get("imagePath").asText());
        product.setStockQuantity(productNode.get("stockQuantity").asInt());
        productRepository.save(product);
    }

    private void seedDemoUser() {
        if (userRepository.existsByUsername("demo")) {
            return;
        }
        User demo = new User();
        demo.setUsername("demo");
        demo.setDisplayName("Demo User");
        demo.setPasswordHash(passwordEncoder.encode("password1"));
        userRepository.save(demo);
        log.info("Seeded demo user");
    }
}
