"""
Product Routers (Cloudinary Enabled, Admin Protected)

All products are variable products.
Media is stored in Cloudinary (no local filesystem).
Only superusers/admins can mutate product or media data.
"""

from fastapi import (
    APIRouter,
    status,
    Form,
    UploadFile,
    File,
    HTTPException,
    Query,
    Path,
    Depends,
    Request
)
from fastapi.responses import JSONResponse

from apps.accounts.dependencies import require_superuser
from apps.accounts.services.permissions import Permission

from apps.products import schemas
from apps.products.services import ProductService

router = APIRouter(prefix="/products")

# ==========================================================
# ===================== PRODUCT ROUTES =====================
# ==========================================================


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.CreateProductOut,
    summary="Create a new product",
    tags=["Product"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def create_product(request: Request, product: schemas.CreateProductIn):
    return {
        "product": ProductService(request).create_product(product.model_dump())
    }


@router.post(
    "/comprehensive",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.CreateProductOut,
    summary="Create a comprehensive product with variants and images",
    tags=["Product"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def create_product_comprehensive(request: Request, product: schemas.CreateProductWithVariantsIn):
    """
    Create a product with all its variants and images in a single request.
    Supports multi-step product creation from the frontend.
    """
    return {
        "product": ProductService(request).create_product_with_variants(product.model_dump())
    }



@router.get(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.RetrieveProductOut,
    summary="Retrieve a single product",
    tags=["Product"],
)
async def retrieve_product(request: Request, product_id: int):
    return {
        "product": ProductService(request).retrieve_product(product_id)
    }


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=schemas.ListProductOut,
    summary="Retrieve a list of products",
    tags=["Product"],
)
async def list_products(request: Request):
    products = ProductService(request).list_products()
    if not products:
        return {"products": []}
    return {"products": products}


@router.put(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.UpdateProductOut,
    summary="Update a product",
    tags=["Product"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def update_product(
    request: Request,
    product_id: int,
    payload: schemas.UpdateProductIn,
):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    return {
        "product": ProductService(request).update_product(product_id, **data)
    }


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
    tags=["Product"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def delete_product(product_id: int):
    ProductService.delete_product(product_id)


# ==========================================================
# ================== PRODUCT VARIANT ROUTES =================
# ==========================================================


@router.get(
    "/variants/{variant_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.RetrieveVariantOut,
    summary="Retrieve a product variant",
    tags=["Product Variant"],
)
async def retrieve_variant(variant_id: int):
    return {
        "variant": ProductService.retrieve_variant(variant_id)
    }


@router.get(
    "/{product_id}/variants",
    status_code=status.HTTP_200_OK,
    response_model=schemas.ListVariantsOut,
    summary="List product variants",
    tags=["Product Variant"],
)
async def list_variants(product_id: int):
    return {
        "variants": ProductService.retrieve_variants(product_id)
    }


@router.put(
    "/variants/{variant_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.UpdateVariantOut,
    summary="Update a product variant",
    tags=["Product Variant"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def update_variant(variant_id: int, payload: schemas.UpdateVariantIn):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    return {
        "variant": ProductService.update_variant(variant_id, **data)
    }


# ==========================================================
# =================== PRODUCT MEDIA ROUTES ==================
# ==========================================================


@router.post(
    "/{product_id}/media",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.CreateProductMediaOut,
    summary="Upload product images",
    tags=["Product Image"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def create_product_media(
    request: Request,
    product_id: int = Path(...),
    files: list[UploadFile] = File(...),
    alt: str | None = Form(None),
):
    media = ProductService(request).create_media(
        product_id=product_id,
        alt=alt,
        files=files,
    )
    return {"media": media}


@router.get(
    '/{product_id}/media',
    status_code=status.HTTP_200_OK,
    response_model=schemas.RetrieveProductMediaOut,
    summary="Receive a list of all Product Images",
    tags=['Product Image']
)
async def list_product_media(request: Request, product_id: int):
    media = ProductService(request).retrieve_media_list(product_id)
    return {"media": media or []}



@router.get(
    "/media/{media_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.RetrieveMediaOut,
    summary="Retrieve a single image",
    tags=["Product Image"],
)
async def retrieve_single_media(request: Request, media_id: int):
    return {
        "media": ProductService(request).retrieve_single_media(media_id)
    }


@router.put(
    "/media/{media_id}",
    status_code=status.HTTP_200_OK,
    response_model=schemas.UpdateMediaOut,
    summary="Update an image",
    tags=["Product Image"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def update_media(
    request: Request,
    media_id: int,
    file: UploadFile | None = File(None),
    alt: str | None = Form(None),
):
    data = {}
    if file:
        data["file"] = file
    if alt:
        data["alt"] = alt

    return {
        "media": ProductService(request).update_media(media_id, **data)
    }


@router.delete(
    "/{product_id}/media",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete images from product",
    tags=["Product Image"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def delete_product_media(
    product_id: int,
    media_ids: str = Query(..., description="Comma separated media IDs"),
):
    ids = list(map(int, media_ids.split(",")))
    ProductService.delete_product_media(product_id, ids)


@router.delete(
    "/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a media file",
    tags=["Product Image"],
    dependencies=[
        Depends(require_superuser),
        Depends(Permission.is_admin),
    ],
)
async def delete_media_file(media_id: int):
    ProductService.delete_media_file(media_id)
