from itertools import product as options_combination

from fastapi import Request
from sqlalchemy import select, and_, or_

from apps.core.date_time import DateTime
# from apps.core.services.media import MediaService
from apps.core.services.cloudinary_service import CloudinaryService

from apps.products.models import Product, ProductOption, ProductOptionItem, ProductVariant, ProductMedia
from config import settings
from config.database import get_db, SessionLocal


class ProductService:
    request: Request | None = None
    product = None
    price: int | float
    stock: int
    options: list | None = []
    options_data: list = []
    variants: list = []
    media: list | None = None

    @classmethod
    def __init__(cls, request: Request | None = None):
        cls.request = request

    @classmethod
    def create_product(cls, data: dict, get_obj: bool = False):

        cls._create_product(data)
        cls.__create_product_options()
        cls.__create_variants()

        if get_obj:
            return cls.product
        return cls.retrieve_product(cls.product.id)

    @classmethod
    def create_product_with_variants(cls, data: dict):
        """
        Comprehensive product creation with variants and images.
        Handles step-by-step product creation from the frontend.
        """
        # Extract all data
        product_data = {
            'product_name': data.get('product_name'),
            'description': data.get('description'),
            'status': data.get('status', 'draft')
        }
        
        options_data = data.get('options', [])
        variants_data = data.get('variants', [])
        product_images_data = data.get('product_images', [])
        
        # Step 1: Create the base product
        cls.product = Product.create(**product_data)
        
        # Step 2: Create options and their items
        option_items_map = {}  # Maps option values to item IDs
        if options_data:
            for option in options_data:
                new_option = ProductOption.create(
                    product_id=cls.product.id, 
                    option_name=option['option_name']
                )
                
                for item_name in option['items']:
                    new_item = ProductOptionItem.create(
                        option_id=new_option.id, 
                        item_name=item_name
                    )
                    # Map the item name to its ID for later variant creation
                    option_items_map[item_name] = new_item.id
        
        # Step 3: Create variants with their specific data
        if variants_data:
            for variant in variants_data:
                # Map option values (strings) to option item IDs
                option1_id = option_items_map.get(variant.get('option1')) if variant.get('option1') else None
                option2_id = option_items_map.get(variant.get('option2')) if variant.get('option2') else None
                option3_id = option_items_map.get(variant.get('option3')) if variant.get('option3') else None
                
                # Create the variant
                new_variant = ProductVariant.create(
                    product_id=cls.product.id,
                    option1=option1_id,
                    option2=option2_id,
                    option3=option3_id,
                    price=variant['price'],
                    stock=variant['stock']
                )
                
                # Create variant-specific images
                variant_images = variant.get('images', [])
                for img in variant_images:
                    ProductMedia.create(
                        product_id=cls.product.id,
                        variant_id=new_variant.id,  # Link to specific variant
                        alt=img.get('alt'),
                        src=img['src'],
                        type=img.get('type', 'image'),
                        cloudinary_id=img['cloudinary_id']
                    )
        else:
            # No variants - create a default variant
            ProductVariant.create(
                product_id=cls.product.id,
                price=0,
                stock=0
            )
        
        # Step 4: Create product-level images (not variant-specific)
        for img in product_images_data:
            ProductMedia.create(
                product_id=cls.product.id,
                variant_id=None,  # Product-level image
                alt=img.get('alt'),
                src=img['src'],
                type=img.get('type', 'image'),
                cloudinary_id=img['cloudinary_id']
            )
        
        # Return the complete product data
        return cls.retrieve_product(cls.product.id)

    @classmethod
    def _create_product(cls, data: dict):
        cls.price = data.pop('price', 0)
        cls.stock = data.pop('stock', 0)
        cls.options_data = data.pop('options', [])

        if 'status' in data:
            # Check if the value is one of the specified values, if not, set it to 'draft'
            valid_statuses = ['active', 'archived', 'draft']
            if data['status'] not in valid_statuses:
                data['status'] = 'draft'

        # create a product
        cls.product = Product.create(**data)

    @classmethod
    def __create_product_options(cls):
        """
        Create new option if it doesn't exist and update its items,
        and ensures that options are uniq in a product and also items in each option are uniq.
        """

        if cls.options_data:
            for option in cls.options_data:

                # Creates a new instance of the ProductOption model, adds it to the database,
                # and commits the transaction. Returns the newly created model instance
                new_option = ProductOption.create(product_id=cls.product.id, option_name=option['option_name'])

                for item in option['items']:
                    ProductOptionItem.create(option_id=new_option.id, item_name=item)
            cls.options = cls.retrieve_options(cls.product.id)
        else:
            cls.options = None

    @classmethod
    def retrieve_options(cls, product_id):
        """
        Get all options of a product
        """

        product_options = []
        options = ProductOption.filter(ProductOption.product_id == product_id).all()
        for option in options:
            # Retrieves records from the database based on a given filter condition.
            # Returns a list of model instances matching the filter condition.
            items = ProductOptionItem.filter(ProductOptionItem.option_id == option.id).all()

            product_options.append({
                'options_id': option.id,
                'option_name': option.option_name,
                'items': [{'item_id': item.id, 'item_name': item.item_name} for item in items]
            })
        if product_options:
            return product_options
        else:
            return None

    @classmethod
    def __create_variants(cls):
        """
        Create a default variant or create variants by options combination.
        """

        if cls.options:

            # create variants by options combination
            items_id = cls.get_item_ids_by_product_id(cls.product.id)
            variants = list(options_combination(*items_id))
            for variant in variants:
                values_tuple = tuple(variant)

                # set each value to an option and set none if it doesn't exist
                while len(values_tuple) < 3:
                    values_tuple += (None,)
                option1, option2, option3 = values_tuple

                ProductVariant.create(
                    product_id=cls.product.id,
                    option1=option1,
                    option2=option2,
                    option3=option3,
                    price=cls.price,
                    stock=cls.stock
                )
        else:
            # set a default variant
            ProductVariant.create(
                product_id=cls.product.id,
                price=cls.price,
                stock=cls.stock
            )

        cls.variants = cls.retrieve_variants(cls.product.id)

    @classmethod
    def retrieve_variants(cls, product_id):
        """
        Get all variants of a product
        """

        product_variants = []
        variants: list[ProductVariant] = ProductVariant.filter(ProductVariant.product_id == product_id).all()
        for variant in variants:
            product_variants.append(
                {
                    "variant_id": variant.id,
                    "product_id": variant.product_id,
                    "price": variant.price,
                    "stock": variant.stock,
                    "option1": variant.option1,
                    "option2": variant.option2,
                    "option3": variant.option3,
                    "created_at": DateTime.string(variant.created_at),
                    "updated_at": DateTime.string(variant.updated_at)
                })

        if product_variants:
            return product_variants
        return None

    @staticmethod
    def retrieve_variant(variant_id: int):
        variant = ProductVariant.get_or_404(variant_id)
        variant_data = {
            "variant_id": variant.id,
            "product_id": variant.product_id,
            "price": variant.price,
            "stock": variant.stock,
            "option1": variant.option1,
            "option2": variant.option2,
            "option3": variant.option3,
            "created_at": DateTime.string(variant.created_at),
            "updated_at": DateTime.string(variant.updated_at)
        }
        return variant_data

    @classmethod
    def get_item_ids_by_product_id(cls, product_id):
        item_ids_by_option = []
        item_ids_dict = {}
        with SessionLocal() as session:

            # Query the ProductOptionItem table to retrieve item_ids
            items = (
                session.query(ProductOptionItem.option_id, ProductOptionItem.id)
                .join(ProductOption)
                .filter(ProductOption.product_id == product_id)
                .all()
            )

            # Separate item_ids by option_id
            for option_id, item_id in items:
                if option_id not in item_ids_dict:
                    item_ids_dict[option_id] = []
                item_ids_dict[option_id].append(item_id)

            # Append `item_ids` lists to the result list
            item_ids_by_option.extend(item_ids_dict.values())

        return item_ids_by_option

    @classmethod
    def retrieve_product(cls, product_id):
        cls.product = Product.get_or_404(product_id)
        cls.options = cls.retrieve_options(product_id)
        cls.variants = cls.retrieve_variants(product_id)
        cls.media = cls.retrieve_media_list(product_id)

        product = {
            'product_id': cls.product.id,
            'product_name': cls.product.product_name,
            'description': cls.product.description,
            'status': cls.product.status,
            'created_at': DateTime.string(cls.product.created_at),
            'updated_at': DateTime.string(cls.product.updated_at),
            'published_at': DateTime.string(cls.product.published_at),
            'options': cls.options,
            'variants': cls.variants,
            'media': cls.media
        }
        return product

    @classmethod
    def update_product(cls, product_id, **kwargs):

        # --- init data ---
        # TODO `updated_at` is autoupdate dont need to code
        kwargs['updated_at'] = DateTime.now()

        # --- update product ---
        Product.update(product_id, **kwargs)
        return cls.retrieve_product(product_id)

    @classmethod
    def update_variant(cls, variant_id, **kwargs):
        # check variant exist
        ProductVariant.get_or_404(variant_id)

        # TODO `updated_at` is autoupdate dont need to code
        kwargs['updated_at'] = DateTime.now()
        ProductVariant.update(variant_id, **kwargs)

        return cls.retrieve_variant(variant_id)

    @classmethod
    def list_products(cls, limit: int = 12):
        # - if "default variant" is not set, first variant will be
        # - on list of products, for price, get it from "default variant"
        # - if price or stock of default variant is 0 then select first variant that is not 0
        # - or for price, get it from "less price"
        # do all of them with graphql and let the front devs decide witch query should be run.

        # also can override the list `limit` in settings.py
        if hasattr(settings, 'products_list_limit'):
            limit = settings.products_list_limit

        products_list = []
        with SessionLocal() as session:
            products = session.execute(
                select(Product.id).limit(limit)
            )

        for product in products:
            products_list.append(cls.retrieve_product(product.id))

        return products_list

    @staticmethod
    def delete_product(product_id: int):
        product = Product.get_or_404(product_id)

        # delete all cloudinary images first
        media_list = ProductMedia.filter(ProductMedia.product_id == product_id).all()
        for media in media_list:
            if media.cloudinary_id:
                CloudinaryService.delete_image(media.cloudinary_id)

        # pass PRIMARY KEY, not object
        Product.delete(product.id)



    # -----------------------------
    # --- PRODUCT MEDIA METHODS ---
    # -----------------------------

    @classmethod
    def create_media(cls, product_id: int, alt: str | None, files):
        product: Product = Product.get_or_404(product_id)

        for file in files:
            upload = CloudinaryService.upload_image(
                file=file,
                folder=f"products/{product_id}"
            )

            ProductMedia.create(
                product_id=product_id,
                alt=alt or product.product_name,
                src=upload["secure_url"],       # FULL CLOUDINARY URL
                type=upload["format"],
                cloudinary_id=upload["public_id"],
            )

        return cls.retrieve_media_list(product_id)

    @classmethod
    def retrieve_media_list(cls, product_id: int):
        media_list = []
        media_rows = ProductMedia.filter(ProductMedia.product_id == product_id).all()

        for media in media_rows:
            media_list.append({
                "media_id": media.id,
                "product_id": media.product_id,
                "alt": media.alt,
                "src": media.src,               # already cloudinary URL
                "type": media.type,
                "created_at": DateTime.string(media.created_at),
                "updated_at": DateTime.string(media.updated_at),
            })

        return media_list or None

    @classmethod
    def retrieve_single_media(cls, media_id: int):
        media = ProductMedia.get_or_404(media_id)

        return {
            "media_id": media.id,
            "product_id": media.product_id,
            "alt": media.alt,
            "src": media.src,
            "type": media.type,
            "created_at": DateTime.string(media.created_at),
            "updated_at": DateTime.string(media.updated_at),
        }

    @classmethod
    def update_media(cls, media_id: int, file=None, alt=None):
        media = ProductMedia.get_or_404(media_id)

        update_data = {}

        #  Replace image if new file provided
        if file:
            # delete old cloudinary image
            if media.cloudinary_id:
                CloudinaryService.delete_image(media.cloudinary_id)

            upload = CloudinaryService.upload_image(
                file=file,
                folder=f"products/{media.product_id}"
            )

            update_data.update({
                "src": upload["secure_url"],
                "type": upload["format"],
                "cloudinary_id": upload["public_id"],
            })

        if alt is not None:
            update_data["alt"] = alt

        update_data["updated_at"] = DateTime.now()

        ProductMedia.update(media_id, **update_data)
        return cls.retrieve_single_media(media_id)

    @classmethod
    def delete_media_file(cls, media_id: int):
        media = ProductMedia.get_or_404(media_id)

        if media.cloudinary_id:
            CloudinaryService.delete_image(media.cloudinary_id)

        ProductMedia.delete(media)
        return True

    @classmethod
    def delete_product_media(cls, product_id: int, media_ids: list[int]):
        product = Product.get_or_404(product_id)

        for media_id in media_ids:
            media = ProductMedia.filter(
                ProductMedia.id == media_id,
                ProductMedia.product_id == product.id
            ).first()

            if not media:
                continue

            # delete from cloudinary
            if media.cloudinary_id:
                CloudinaryService.delete_image(media.cloudinary_id)

            # delete from DB (IMPORTANT FIX)
            ProductMedia.delete(media.id)

        return True
