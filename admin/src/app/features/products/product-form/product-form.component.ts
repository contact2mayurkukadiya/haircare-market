import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService, Category } from '../../../core/services/category.service';
import { ApiService } from '../../../core/services/api.service';
import { Observable, Observer } from 'rxjs';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzInputNumberModule,
    NzSwitchModule,
    NzUploadModule,
    NzIconModule,
    NzSelectModule
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private message = inject(NzMessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public api = inject(ApiService);

  form: FormGroup;
  productId: string | null = null;
  isEditMode = false;
  fileList: NzUploadFile[] = [];
  categories: Category[] = [];

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      desc: ['', [Validators.maxLength(1000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      category: ['', [Validators.required]],
      tags: [[]],
      isFeatured: [false],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.categoryService.loadAllCategories().subscribe(res => this.categories = res);
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.loadProduct(this.productId);
    }
  }

  /**
   * Extract just the filename from a full URL.
   * e.g. "http://localhost:3000/static/products/abc.jpg" → "abc.jpg"
   */
  private extractFilename(urlOrName: string): string {
    try {
      // If it looks like a URL, pull the last path segment
      if (urlOrName.startsWith('http') || urlOrName.startsWith('/')) {
        return urlOrName.split('/').pop() ?? urlOrName;
      }
    } catch { /* fall through */ }
    return urlOrName;
  }

  loadProduct(id: string): void {
    this.productService.loadProductById(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          ...product,
          category: product.category?._id || product.category
        });
        if (product.images && product.images.length > 0) {
          // API returns full URLs — keep full URL for display, extract filename for uid/name
          this.fileList = product.images.map((img) => {
            const filename = this.extractFilename(img);
            return {
              uid: filename,        // use bare filename as the stable identifier
              name: filename,       // displayed label
              status: 'done',
              url: img,             // full URL so the thumbnail renders properly
            } as NzUploadFile;
          });
        }
      },
      error: () => {
        this.message.error('Failed to load product details');
        this.router.navigate(['/admin/products']);
      }
    });
  }

  /**
   * Validate file type/size and immediately generate a local object-URL preview
   * so the nz-upload thumbnail shows the image without a network request.
   */
  beforeUpload = (file: NzUploadFile, _fileList: NzUploadFile[]): Observable<boolean> => {
    return new Observable((observer: Observer<boolean>) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
      if (!isJpgOrPng) {
        this.message.error('You can only upload JPG/PNG/WEBP files!');
        observer.complete();
        return;
      }
      const isLt2M = file.size! / 1024 / 1024 < 2;
      if (!isLt2M) {
        this.message.error('Image must be smaller than 2MB!');
        observer.complete();
        return;
      }

      // Generate a local preview URL to avoid 404 console errors and "not found" tooltips
      if (file.originFileObj) {
        const objectUrl = URL.createObjectURL(file.originFileObj);
        file.url = objectUrl;
        file.thumbUrl = objectUrl;
      }

      observer.next(true);
      observer.complete();
    });
  };

  submitForm(): void {
    if (this.form.valid) {
      const formData = new FormData();

      // Append scalar form fields
      Object.keys(this.form.value).forEach(key => {
        const val = this.form.value[key];
        if (val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });

      if (this.isEditMode) {
        // Collect filenames of still-present "done" images (existing images to keep)
        const existingImages = this.fileList
          .filter(f => f.status === 'done' && !f.originFileObj)
          .map(f => this.extractFilename(f.uid));   // uid was set to the bare filename on load

        existingImages.forEach(name => formData.append('existing_images[]', name));

        // Append newly selected files
        const newFiles = this.fileList.filter(f => !!f.originFileObj);
        newFiles.forEach((file: any) => {
          formData.append('new_images', file.originFileObj);
        });

        if (this.productId) {
          this.productService.updateProduct(this.productId, formData).subscribe({
            next: () => {
              this.message.success('Product updated successfully');
              this.router.navigate(['/admin/products']);
            },
            error: (err) => this.message.error('Failed to update product: ' + (err.error?.message || err.message))
          });
        }
      } else {
        // Create: all selected files go as `images`
        this.fileList.forEach((file: any) => {
          formData.append('images', file.originFileObj || file);
        });

        this.productService.createProduct(formData).subscribe({
          next: () => {
            this.message.success('Product created successfully');
            this.router.navigate(['/admin/products']);
          },
          error: (err) => this.message.error('Failed to create product: ' + (err.error?.message || err.message))
        });
      }
    } else {
      Object.values(this.form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }
}
