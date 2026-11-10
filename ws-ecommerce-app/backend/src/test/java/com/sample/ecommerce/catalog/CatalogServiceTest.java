package com.sample.ecommerce.catalog;

import com.sample.ecommerce.common.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CatalogService catalogService;

    @Test
    void listProductsUnknownCategoryThrowsNotFound() {
        when(categoryRepository.findBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.listProducts("missing", null, null, null, null, 0, 20))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(api.getCode()).isEqualTo("CATEGORY_NOT_FOUND");
                });

        verify(productRepository, never()).search(any(), any(), any(), any(), any());
    }

    @Test
    void listProductsNegativeMinPriceThrowsInvalidPrice() {
        assertThatThrownBy(() -> catalogService.listProducts(null, null, -1, null, null, 0, 20))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_PRICE"));
    }

    @Test
    void listProductsNegativeMaxPriceThrowsInvalidPrice() {
        assertThatThrownBy(() -> catalogService.listProducts(null, null, null, -5, null, 0, 20))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_PRICE"));
    }

    @Test
    void listProductsMinGreaterThanMaxThrowsInvalidPrice() {
        assertThatThrownBy(() -> catalogService.listProducts(null, null, 500, 100, null, 0, 20))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("INVALID_PRICE"));
    }

    @Test
    void listProductsUnknownSortThrowsInvalidSort() {
        assertThatThrownBy(() -> catalogService.listProducts(null, null, null, null, "popularity", 0, 20))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(api.getCode()).isEqualTo("INVALID_SORT");
                });
    }

    @Test
    void listProductsClampsPageAndSizeAndCallsSearch() {
        Category category = new Category();
        category.setId(1L);
        category.setName("Gadgets");
        category.setSlug("gadgets");

        Product product = new Product();
        product.setId(10L);
        product.setSku("SKU-1");
        product.setName("Widget");
        product.setDescription("A widget");
        product.setPriceCents(999);
        product.setImagePath("/img/widget.png");
        product.setStockQuantity(5);
        product.setCategory(category);

        Page<Product> page = new PageImpl<>(List.of(product));
        when(productRepository.search(isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        CatalogDtos.ProductPageResponse response =
                catalogService.listProducts(null, null, null, null, "price_asc", -3, 100);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().name()).isEqualTo("Widget");
        assertThat(response.total()).isEqualTo(1);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).search(isNull(), isNull(), isNull(), isNull(), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(50);
        assertThat(pageable.getSort().getOrderFor("priceCents").getDirection()).isEqualTo(Sort.Direction.ASC);
    }

    @Test
    void getProductMissingThrowsNotFound() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.getProduct(99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException api = (ApiException) ex;
                    assertThat(api.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(api.getCode()).isEqualTo("PRODUCT_NOT_FOUND");
                });
    }

    @Test
    void listCategoriesMapsRepositoryResults() {
        Category category = new Category();
        category.setId(1L);
        category.setName("Gadgets");
        category.setSlug("gadgets");
        when(categoryRepository.findAll(any(Sort.class))).thenReturn(List.of(category));

        List<CatalogDtos.CategoryResponse> categories = catalogService.listCategories();

        assertThat(categories).containsExactly(new CatalogDtos.CategoryResponse(1L, "Gadgets", "gadgets"));
        verify(categoryRepository).findAll(eq(Sort.by("name")));
    }
}
