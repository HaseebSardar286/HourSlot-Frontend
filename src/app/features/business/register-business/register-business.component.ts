import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register-business',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-business.component.html',
  styleUrl: './register-business.component.css'
})
export class RegisterBusinessComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  businessForm = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    logoUrl: ['']
  });

  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.businessForm.invalid) {
      this.businessForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = this.businessForm.value;

    this.http.post<any>('/api/business/register', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Business application submitted!';
        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to submit application. Please try again.';
      }
    });
  }
}
