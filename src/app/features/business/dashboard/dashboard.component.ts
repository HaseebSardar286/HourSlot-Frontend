import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class BusinessDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  activeTab = 'overview'; // 'overview', 'branches', 'services', 'staff', 'availability'
  business: any = null;
  branches: any[] = [];
  services: any[] = [];
  staffList: any[] = [];

  // Form declarations
  branchForm = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    latitude: [37.7749, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [-122.4194, [Validators.required, Validators.min(-180), Validators.max(180)]],
    phoneNumber: ['']
  });

  serviceForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [30, [Validators.required, Validators.min(5)]]
  });

  staffForm = this.fb.group({
    name: ['', Validators.required],
    designation: [''],
    branchId: ['', Validators.required]
  });

  hoursForm = this.fb.group({
    branchId: ['', Validators.required],
    dayOfWeek: [1, Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required],
    closed: [false]
  });

  holidayForm = this.fb.group({
    branchId: ['', Validators.required],
    date: ['', Validators.required],
    description: ['']
  });

  loading = false;
  message: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.loadBusinessProfile();
  }

  loadBusinessProfile(): void {
    this.loading = true;
    this.http.get<any>('/api/business/profile').subscribe({
      next: (profile) => {
        this.business = profile;
        this.loadBranches();
        this.loadServices();
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Could not load business profile. Have you registered your business yet?';
      }
    });
  }

  loadBranches(): void {
    this.http.get<any[]>('/api/business/branches').subscribe({
      next: (data) => {
        this.branches = data;
        if (data.length > 0) {
          // Set default branch in forms
          const defaultBranchId = data[0].id.toString();
          this.staffForm.patchValue({ branchId: defaultBranchId });
          this.hoursForm.patchValue({ branchId: defaultBranchId });
          this.holidayForm.patchValue({ branchId: defaultBranchId });
          
          // Load staff for the default branch
          this.loadStaff(data[0].id);
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadServices(): void {
    this.http.get<any[]>('/api/business/services').subscribe({
      next: (data) => this.services = data
    });
  }

  loadStaff(branchId: number): void {
    this.http.get<any[]>(`/api/business/branches/${branchId}/staff`).subscribe({
      next: (data) => this.staffList = data
    });
  }

  onAddBranch(): void {
    if (this.branchForm.invalid) return;
    this.http.post<any>('/api/business/branches', this.branchForm.value).subscribe({
      next: (res) => {
        this.message = res.message;
        this.branchForm.reset({ latitude: 37.7749, longitude: -122.4194 });
        this.loadBranches();
      },
      error: (err) => this.error = err.error?.message || 'Failed to add branch'
    });
  }

  onAddService(): void {
    if (this.serviceForm.invalid) return;
    this.http.post<any>('/api/business/services', this.serviceForm.value).subscribe({
      next: (res) => {
        this.message = res.message;
        this.serviceForm.reset({ price: 0, durationMinutes: 30 });
        this.loadServices();
      },
      error: (err) => this.error = err.error?.message || 'Failed to add service'
    });
  }

  onAddStaff(): void {
    if (this.staffForm.invalid) return;
    this.http.post<any>('/api/business/staff', this.staffForm.value).subscribe({
      next: (res) => {
        this.message = res.message;
        const bId = this.staffForm.value.branchId;
        this.staffForm.reset({ branchId: bId });
        this.loadStaff(Number(bId));
      },
      error: (err) => this.error = err.error?.message || 'Failed to add staff'
    });
  }

  onConfigureHours(): void {
    if (this.hoursForm.invalid) return;
    this.http.post<any>('/api/business/working-hours', this.hoursForm.value).subscribe({
      next: (res) => {
        this.message = res.message;
      },
      error: (err) => this.error = err.error?.message || 'Failed to update hours'
    });
  }

  onAddHoliday(): void {
    if (this.holidayForm.invalid) return;
    this.http.post<any>('/api/business/holidays', this.holidayForm.value).subscribe({
      next: (res) => {
        this.message = res.message;
        const bId = this.holidayForm.value.branchId;
        this.holidayForm.reset({ branchId: bId });
      },
      error: (err) => this.error = err.error?.message || 'Failed to register holiday'
    });
  }

  clearAlerts(): void {
    this.message = null;
    this.error = null;
  }
}
