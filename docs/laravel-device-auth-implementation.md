# Laravel Device Authentication Implementation Guide

Complete implementation guide for adding device-based authentication to the **flowbin** Laravel application to support **local-flowbin** PWA integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Setup](#1-database-setup)
3. [Configuration](#2-configuration)
4. [Models](#3-models)
5. [Services](#4-services)
6. [Form Requests](#5-form-requests)
7. [API Resources](#6-api-resources)
8. [Middleware](#7-middleware)
9. [Controllers](#8-controllers)
10. [Routes](#9-routes)
11. [Admin Management](#10-admin-management)
12. [Events & Notifications](#11-events--notifications)
13. [Testing](#12-testing)
14. [Deployment Checklist](#13-deployment-checklist)

---

## Overview

### What We're Building

A device authentication system that allows the local-flowbin PWA to:
- Activate devices using user credentials
- Maintain long-lived sessions with refresh capability
- Work offline after initial activation
- Be remotely managed (suspended/revoked) by admins

### API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/device-auth/activate` | None | Activate new device |
| POST | `/api/device-auth/refresh` | None | Refresh expired token |
| GET | `/api/device-auth/validate` | Device | Validate & get profile |
| GET | `/api/device-auth/profile` | Device | Get user profile |
| POST | `/api/device-auth/deactivate` | Device | Deactivate device |
| GET | `/api/admin/devices` | Admin | List all devices |
| GET | `/api/admin/devices/{id}` | Admin | Device details |
| PATCH | `/api/admin/devices/{id}/suspend` | Admin | Suspend device |
| PATCH | `/api/admin/devices/{id}/reactivate` | Admin | Reactivate device |
| DELETE | `/api/admin/devices/{id}` | Admin | Revoke device |

---

## 1. Database Setup

### 1.1 Create Devices Migration

```bash
php artisan make:migration create_devices_table
```

```php
<?php
// database/migrations/xxxx_xx_xx_create_devices_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_id')->unique();
            $table->string('device_name')->nullable();
            $table->string('device_token', 500);
            $table->string('refresh_token', 500);
            $table->timestamp('token_expires_at');
            $table->timestamp('refresh_expires_at');
            $table->timestamp('last_seen_at')->nullable();
            $table->string('last_ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->enum('status', ['active', 'suspended', 'revoked'])->default('active');
            $table->foreignId('distribution_center_id')->nullable()->constrained()->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['device_token'], 'idx_device_token');
            $table->index(['status', 'user_id'], 'idx_status_user');
            $table->index('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
```

### 1.2 Create Device Audit Log Migration

```bash
php artisan make:migration create_device_audit_logs_table
```

```php
<?php
// database/migrations/xxxx_xx_xx_create_device_audit_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->enum('event_type', [
                'activated',
                'refreshed',
                'validated',
                'suspended',
                'reactivated',
                'revoked',
                'deactivated',
                'failed_auth'
            ]);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['device_id', 'created_at']);
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_audit_logs');
    }
};
```

### 1.3 Add Mobile Access Permission to Users (Optional)

```bash
php artisan make:migration add_mobile_access_to_users_table
```

```php
<?php
// database/migrations/xxxx_xx_xx_add_mobile_access_to_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('can_use_mobile_app')->default(true)->after('email');
            $table->unsignedInteger('max_devices')->default(3)->after('can_use_mobile_app');
            $table->foreignId('default_distribution_center_id')
                ->nullable()
                ->after('max_devices')
                ->constrained('distribution_centers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_distribution_center_id');
            $table->dropColumn(['can_use_mobile_app', 'max_devices']);
        });
    }
};
```

### 1.4 Run Migrations

```bash
php artisan migrate
```

---

## 2. Configuration

### 2.1 Create Config File

```php
<?php
// config/device-auth.php

return [
    /*
    |--------------------------------------------------------------------------
    | Token Expiration
    |--------------------------------------------------------------------------
    |
    | How long device tokens remain valid before requiring refresh.
    |
    */
    'token_expiry_days' => env('DEVICE_TOKEN_EXPIRY_DAYS', 30),
    'refresh_token_expiry_days' => env('DEVICE_REFRESH_TOKEN_EXPIRY_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Device Limits
    |--------------------------------------------------------------------------
    |
    | Maximum number of active devices per user.
    |
    */
    'default_max_devices' => env('DEVICE_MAX_PER_USER', 3),

    /*
    |--------------------------------------------------------------------------
    | Token Settings
    |--------------------------------------------------------------------------
    |
    | Token generation settings.
    |
    */
    'token_length' => 32, // Results in 64 char hex string

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Rate limits for device auth endpoints.
    |
    */
    'rate_limits' => [
        'activation' => [
            'attempts' => 5,
            'decay_minutes' => 15,
        ],
        'refresh' => [
            'attempts' => 10,
            'decay_minutes' => 5,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit Logging
    |--------------------------------------------------------------------------
    |
    | Enable/disable audit logging for device events.
    |
    */
    'audit_logging' => env('DEVICE_AUDIT_LOGGING', true),
];
```

### 2.2 Environment Variables

```bash
# .env
DEVICE_TOKEN_EXPIRY_DAYS=30
DEVICE_REFRESH_TOKEN_EXPIRY_DAYS=90
DEVICE_MAX_PER_USER=3
DEVICE_AUDIT_LOGGING=true
```

---

## 3. Models

### 3.1 Device Model

```bash
php artisan make:model Device
```

```php
<?php
// app/Models/Device.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_id',
        'device_name',
        'device_token',
        'refresh_token',
        'token_expires_at',
        'refresh_expires_at',
        'last_seen_at',
        'last_ip',
        'user_agent',
        'status',
        'distribution_center_id',
        'metadata',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'refresh_expires_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected $hidden = [
        'device_token',
        'refresh_token',
    ];

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function distributionCenter(): BelongsTo
    {
        return $this->belongsTo(DistributionCenter::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(DeviceAuditLog::class);
    }

    // ─────────────────────────────────────────────────────────────
    // Scopes
    // ─────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeSuspended(Builder $query): Builder
    {
        return $query->where('status', 'suspended');
    }

    public function scopeRevoked(Builder $query): Builder
    {
        return $query->where('status', 'revoked');
    }

    public function scopeWithValidToken(Builder $query): Builder
    {
        return $query->where('token_expires_at', '>', now());
    }

    public function scopeWithExpiredToken(Builder $query): Builder
    {
        return $query->where('token_expires_at', '<=', now());
    }

    public function scopeInactive(Builder $query, int $days = 30): Builder
    {
        return $query->where('last_seen_at', '<', now()->subDays($days));
    }

    // ─────────────────────────────────────────────────────────────
    // Accessors & Methods
    // ─────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isRevoked(): bool
    {
        return $this->status === 'revoked';
    }

    public function hasValidToken(): bool
    {
        return $this->token_expires_at > now();
    }

    public function hasValidRefreshToken(): bool
    {
        return $this->refresh_expires_at > now();
    }

    public function tokenExpiresInDays(): int
    {
        return (int) now()->diffInDays($this->token_expires_at, false);
    }

    public function suspend(string $reason = null, User $performer = null): void
    {
        $this->update(['status' => 'suspended']);
        $this->logEvent('suspended', $performer, ['reason' => $reason]);
    }

    public function reactivate(User $performer = null): void
    {
        $this->update(['status' => 'active']);
        $this->logEvent('reactivated', $performer);
    }

    public function revoke(string $reason = null, User $performer = null): void
    {
        $this->update(['status' => 'revoked']);
        $this->logEvent('revoked', $performer, ['reason' => $reason]);
    }

    public function logEvent(
        string $eventType,
        ?User $performer = null,
        array $metadata = [],
        ?string $ip = null,
        ?string $userAgent = null
    ): void {
        if (!config('device-auth.audit_logging')) {
            return;
        }

        $this->auditLogs()->create([
            'event_type' => $eventType,
            'ip_address' => $ip ?? request()->ip(),
            'user_agent' => $userAgent ?? request()->userAgent(),
            'metadata' => $metadata,
            'performed_by' => $performer?->id,
        ]);
    }
}
```

### 3.2 DeviceAuditLog Model

```bash
php artisan make:model DeviceAuditLog
```

```php
<?php
// app/Models/DeviceAuditLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'device_id',
        'event_type',
        'ip_address',
        'user_agent',
        'metadata',
        'performed_by',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
```

### 3.3 Update User Model

```php
<?php
// app/Models/User.php (add these methods/relationships)

// Add to existing User model:

public function devices(): HasMany
{
    return $this->hasMany(Device::class);
}

public function activeDevices(): HasMany
{
    return $this->hasMany(Device::class)->active();
}

public function defaultDistributionCenter(): BelongsTo
{
    return $this->belongsTo(DistributionCenter::class, 'default_distribution_center_id');
}

public function canActivateDevices(): bool
{
    return $this->can_use_mobile_app && $this->is_active;
}

public function hasReachedDeviceLimit(): bool
{
    $maxDevices = $this->max_devices ?? config('device-auth.default_max_devices');
    return $this->activeDevices()->count() >= $maxDevices;
}

public function getPermissionsArray(): array
{
    // Adjust based on your permission system (Spatie, Bouncer, custom, etc.)
    // Example for Spatie:
    // return $this->getAllPermissions()->pluck('name')->toArray();

    // Simple role-based example:
    return match($this->role) {
        'admin' => ['receive', 'release', 'inventory_view', 'inventory_adjust', 'settings'],
        'supervisor' => ['receive', 'release', 'inventory_view', 'inventory_adjust'],
        'operator' => ['receive', 'release', 'inventory_view'],
        default => ['inventory_view'],
    };
}
```

---

## 4. Services

### 4.1 Device Token Service

```bash
php artisan make:service DeviceTokenService
# Or manually create:
mkdir -p app/Services
```

```php
<?php
// app/Services/DeviceTokenService.php

namespace App\Services;

class DeviceTokenService
{
    /**
     * Generate a new device token.
     */
    public function generateToken(): string
    {
        $length = config('device-auth.token_length', 32);
        return bin2hex(random_bytes($length));
    }

    /**
     * Generate a new refresh token.
     */
    public function generateRefreshToken(): string
    {
        return $this->generateToken();
    }

    /**
     * Hash a token for storage.
     */
    public function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Verify a token against its hash.
     */
    public function verifyToken(string $token, string $hash): bool
    {
        return hash_equals($hash, $this->hashToken($token));
    }

    /**
     * Get token expiration date.
     */
    public function getTokenExpiration(): \DateTime
    {
        $days = config('device-auth.token_expiry_days', 30);
        return now()->addDays($days);
    }

    /**
     * Get refresh token expiration date.
     */
    public function getRefreshTokenExpiration(): \DateTime
    {
        $days = config('device-auth.refresh_token_expiry_days', 90);
        return now()->addDays($days);
    }
}
```

### 4.2 Device Auth Service

```php
<?php
// app/Services/DeviceAuthService.php

namespace App\Services;

use App\Models\Device;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DeviceAuthService
{
    public function __construct(
        protected DeviceTokenService $tokenService
    ) {}

    /**
     * Activate a device for a user.
     */
    public function activateDevice(
        string $email,
        string $password,
        string $deviceId,
        ?string $deviceName = null,
        ?string $ip = null,
        ?string $userAgent = null
    ): array {
        // Validate credentials
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return [
                'success' => false,
                'error' => 'invalid_credentials',
                'message' => 'Email or password is incorrect',
            ];
        }

        // Check if user can activate devices
        if (!$user->canActivateDevices()) {
            return [
                'success' => false,
                'error' => 'not_authorized',
                'message' => 'User not authorized for mobile access',
            ];
        }

        // Check for existing device
        $existingDevice = Device::where('device_id', $deviceId)->first();

        if ($existingDevice) {
            if ($existingDevice->isRevoked()) {
                return [
                    'success' => false,
                    'error' => 'device_revoked',
                    'message' => 'This device has been permanently revoked',
                ];
            }

            // Reactivate existing device
            return $this->reactivateExistingDevice($existingDevice, $user, $ip, $userAgent);
        }

        // Check device limit
        if ($user->hasReachedDeviceLimit()) {
            return [
                'success' => false,
                'error' => 'device_limit_reached',
                'message' => 'Maximum device limit reached',
                'active_devices' => $user->activeDevices()
                    ->select(['id', 'device_name', 'last_seen_at'])
                    ->get(),
            ];
        }

        // Create new device
        return $this->createNewDevice($user, $deviceId, $deviceName, $ip, $userAgent);
    }

    /**
     * Refresh device tokens.
     */
    public function refreshTokens(
        string $deviceToken,
        string $refreshToken,
        ?string $ip = null,
        ?string $userAgent = null
    ): array {
        $device = Device::where('device_token', $this->tokenService->hashToken($deviceToken))
            ->where('refresh_token', $this->tokenService->hashToken($refreshToken))
            ->with(['user', 'distributionCenter'])
            ->first();

        if (!$device) {
            return [
                'success' => false,
                'error' => 'invalid_tokens',
                'message' => 'Invalid device or refresh token',
            ];
        }

        if ($device->isRevoked()) {
            return [
                'success' => false,
                'error' => 'device_revoked',
                'message' => 'This device has been revoked',
            ];
        }

        if ($device->isSuspended()) {
            return [
                'success' => false,
                'error' => 'device_suspended',
                'message' => 'This device is suspended',
            ];
        }

        if (!$device->hasValidRefreshToken()) {
            return [
                'success' => false,
                'error' => 'refresh_token_expired',
                'message' => 'Refresh token expired. Please reactivate device.',
            ];
        }

        // Generate new tokens
        $newDeviceToken = $this->tokenService->generateToken();
        $newRefreshToken = $this->tokenService->generateRefreshToken();

        $device->update([
            'device_token' => $this->tokenService->hashToken($newDeviceToken),
            'refresh_token' => $this->tokenService->hashToken($newRefreshToken),
            'token_expires_at' => $this->tokenService->getTokenExpiration(),
            'refresh_expires_at' => $this->tokenService->getRefreshTokenExpiration(),
            'last_seen_at' => now(),
            'last_ip' => $ip ?? request()->ip(),
            'user_agent' => $userAgent ?? request()->userAgent(),
        ]);

        $device->logEvent('refreshed', null, [], $ip, $userAgent);

        return [
            'success' => true,
            'device_token' => $newDeviceToken,
            'refresh_token' => $newRefreshToken,
            'token_expires_at' => $device->token_expires_at->toIso8601String(),
            'refresh_expires_at' => $device->refresh_expires_at->toIso8601String(),
        ];
    }

    /**
     * Validate a device token and return device info.
     */
    public function validateDevice(string $deviceToken): array
    {
        $hashedToken = $this->tokenService->hashToken($deviceToken);

        $device = Device::where('device_token', $hashedToken)
            ->with(['user', 'distributionCenter'])
            ->first();

        if (!$device) {
            return [
                'success' => false,
                'error' => 'invalid_device_token',
                'message' => 'Device token not found',
            ];
        }

        if ($device->isRevoked()) {
            return [
                'success' => false,
                'error' => 'device_revoked',
                'message' => 'This device has been revoked',
            ];
        }

        if ($device->isSuspended()) {
            return [
                'success' => false,
                'error' => 'device_suspended',
                'message' => 'This device is suspended',
            ];
        }

        if (!$device->hasValidToken()) {
            return [
                'success' => false,
                'error' => 'token_expired',
                'message' => 'Device token expired',
            ];
        }

        // Update last seen
        $device->update([
            'last_seen_at' => now(),
            'last_ip' => request()->ip(),
        ]);

        return [
            'success' => true,
            'device' => $device,
        ];
    }

    /**
     * Deactivate a device (user-initiated).
     */
    public function deactivateDevice(Device $device): array
    {
        $device->update(['status' => 'revoked']);
        $device->logEvent('deactivated');

        return [
            'success' => true,
            'message' => 'Device deactivated successfully',
        ];
    }

    /**
     * Find device by token (for middleware).
     */
    public function findByToken(string $token): ?Device
    {
        return Device::where('device_token', $this->tokenService->hashToken($token))
            ->with(['user', 'distributionCenter'])
            ->first();
    }

    // ─────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────

    private function createNewDevice(
        User $user,
        string $deviceId,
        ?string $deviceName,
        ?string $ip,
        ?string $userAgent
    ): array {
        $deviceToken = $this->tokenService->generateToken();
        $refreshToken = $this->tokenService->generateRefreshToken();

        $device = DB::transaction(function () use (
            $user, $deviceId, $deviceName, $deviceToken, $refreshToken, $ip, $userAgent
        ) {
            $device = Device::create([
                'user_id' => $user->id,
                'device_id' => $deviceId,
                'device_name' => $deviceName,
                'device_token' => $this->tokenService->hashToken($deviceToken),
                'refresh_token' => $this->tokenService->hashToken($refreshToken),
                'token_expires_at' => $this->tokenService->getTokenExpiration(),
                'refresh_expires_at' => $this->tokenService->getRefreshTokenExpiration(),
                'distribution_center_id' => $user->default_distribution_center_id,
                'last_seen_at' => now(),
                'last_ip' => $ip ?? request()->ip(),
                'user_agent' => $userAgent ?? request()->userAgent(),
                'status' => 'active',
            ]);

            $device->logEvent('activated', null, [], $ip, $userAgent);

            return $device;
        });

        return $this->buildActivationResponse($device, $user, $deviceToken, $refreshToken);
    }

    private function reactivateExistingDevice(
        Device $device,
        User $user,
        ?string $ip,
        ?string $userAgent
    ): array {
        $deviceToken = $this->tokenService->generateToken();
        $refreshToken = $this->tokenService->generateRefreshToken();

        $device->update([
            'user_id' => $user->id,
            'device_token' => $this->tokenService->hashToken($deviceToken),
            'refresh_token' => $this->tokenService->hashToken($refreshToken),
            'token_expires_at' => $this->tokenService->getTokenExpiration(),
            'refresh_expires_at' => $this->tokenService->getRefreshTokenExpiration(),
            'distribution_center_id' => $user->default_distribution_center_id,
            'last_seen_at' => now(),
            'last_ip' => $ip ?? request()->ip(),
            'user_agent' => $userAgent ?? request()->userAgent(),
            'status' => 'active',
        ]);

        $device->logEvent('activated', null, ['reactivation' => true], $ip, $userAgent);

        return $this->buildActivationResponse($device->fresh(), $user, $deviceToken, $refreshToken);
    }

    private function buildActivationResponse(
        Device $device,
        User $user,
        string $deviceToken,
        string $refreshToken
    ): array {
        return [
            'success' => true,
            'device_token' => $deviceToken,
            'refresh_token' => $refreshToken,
            'token_expires_at' => $device->token_expires_at->toIso8601String(),
            'refresh_expires_at' => $device->refresh_expires_at->toIso8601String(),
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url,
            ],
            'distribution_center' => $device->distributionCenter ? [
                'id' => $device->distributionCenter->id,
                'name' => $device->distributionCenter->name,
                'code' => $device->distributionCenter->code,
            ] : null,
            'permissions' => $user->getPermissionsArray(),
        ];
    }
}
```

---

## 5. Form Requests

### 5.1 Device Activation Request

```bash
php artisan make:request DeviceActivationRequest
```

```php
<?php
// app/Http/Requests/DeviceActivationRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeviceActivationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'device_id' => ['required', 'string', 'uuid', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'device_id.uuid' => 'Device ID must be a valid UUID',
        ];
    }
}
```

### 5.2 Device Refresh Request

```bash
php artisan make:request DeviceRefreshRequest
```

```php
<?php
// app/Http/Requests/DeviceRefreshRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeviceRefreshRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_token' => ['required', 'string', 'size:64'],
            'refresh_token' => ['required', 'string', 'size:64'],
        ];
    }
}
```

---

## 6. API Resources

### 6.1 User Profile Resource

```bash
php artisan make:resource UserProfileResource
```

```php
<?php
// app/Http/Resources/UserProfileResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            'permissions' => $this->getPermissionsArray(),
        ];
    }
}
```

### 6.2 Device Resource

```bash
php artisan make:resource DeviceResource
```

```php
<?php
// app/Http/Resources/DeviceResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'device_id' => $this->device_id,
            'device_name' => $this->device_name,
            'status' => $this->status,
            'token_expires_at' => $this->token_expires_at?->toIso8601String(),
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
            'last_ip' => $this->last_ip,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at->toIso8601String(),
            'user' => new UserProfileResource($this->whenLoaded('user')),
            'distribution_center' => new DistributionCenterResource($this->whenLoaded('distributionCenter')),
        ];
    }
}
```

### 6.3 Distribution Center Resource

```bash
php artisan make:resource DistributionCenterResource
```

```php
<?php
// app/Http/Resources/DistributionCenterResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DistributionCenterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->when($this->address, $this->address),
        ];
    }
}
```

---

## 7. Middleware

### 7.1 Device Authentication Middleware

```bash
php artisan make:middleware DeviceAuthentication
```

```php
<?php
// app/Http/Middleware/DeviceAuthentication.php

namespace App\Http\Middleware;

use App\Services\DeviceAuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DeviceAuthentication
{
    public function __construct(
        protected DeviceAuthService $deviceAuthService
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Device-Token');

        if (!$token) {
            return response()->json([
                'error' => 'missing_device_token',
                'message' => 'Device token is required',
            ], 401);
        }

        $result = $this->deviceAuthService->validateDevice($token);

        if (!$result['success']) {
            $statusCode = match($result['error']) {
                'device_revoked' => 403,
                'device_suspended' => 403,
                'token_expired' => 401,
                default => 401,
            };

            return response()->json([
                'error' => $result['error'],
                'message' => $result['message'],
            ], $statusCode);
        }

        // Attach device and user to request
        $request->merge([
            'device' => $result['device'],
            'authenticated_user' => $result['device']->user,
        ]);

        return $next($request);
    }
}
```

### 7.2 Register Middleware

```php
<?php
// bootstrap/app.php (Laravel 11) or app/Http/Kernel.php (Laravel 10)

// Laravel 11 (bootstrap/app.php):
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'device.auth' => \App\Http\Middleware\DeviceAuthentication::class,
    ]);
})

// Laravel 10 (app/Http/Kernel.php):
protected $middlewareAliases = [
    // ... existing middleware
    'device.auth' => \App\Http\Middleware\DeviceAuthentication::class,
];
```

---

## 8. Controllers

### 8.1 Device Auth Controller

```bash
php artisan make:controller Api/DeviceAuthController
```

```php
<?php
// app/Http/Controllers/Api/DeviceAuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeviceActivationRequest;
use App\Http\Requests\DeviceRefreshRequest;
use App\Http\Resources\UserProfileResource;
use App\Http\Resources\DistributionCenterResource;
use App\Services\DeviceAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceAuthController extends Controller
{
    public function __construct(
        protected DeviceAuthService $deviceAuthService
    ) {}

    /**
     * Activate a new device.
     *
     * POST /api/device-auth/activate
     */
    public function activate(DeviceActivationRequest $request): JsonResponse
    {
        $result = $this->deviceAuthService->activateDevice(
            email: $request->validated('email'),
            password: $request->validated('password'),
            deviceId: $request->validated('device_id'),
            deviceName: $request->validated('device_name'),
            ip: $request->ip(),
            userAgent: $request->userAgent(),
        );

        if (!$result['success']) {
            $statusCode = match($result['error']) {
                'invalid_credentials' => 401,
                'not_authorized' => 403,
                'device_revoked' => 403,
                'device_limit_reached' => 409,
                default => 400,
            };

            return response()->json([
                'error' => $result['error'],
                'message' => $result['message'],
                'active_devices' => $result['active_devices'] ?? null,
            ], $statusCode);
        }

        return response()->json($result, 201);
    }

    /**
     * Refresh device tokens.
     *
     * POST /api/device-auth/refresh
     */
    public function refresh(DeviceRefreshRequest $request): JsonResponse
    {
        $result = $this->deviceAuthService->refreshTokens(
            deviceToken: $request->validated('device_token'),
            refreshToken: $request->validated('refresh_token'),
            ip: $request->ip(),
            userAgent: $request->userAgent(),
        );

        if (!$result['success']) {
            $statusCode = match($result['error']) {
                'device_revoked' => 403,
                'device_suspended' => 403,
                'refresh_token_expired' => 401,
                default => 401,
            };

            return response()->json([
                'error' => $result['error'],
                'message' => $result['message'],
            ], $statusCode);
        }

        return response()->json($result);
    }

    /**
     * Validate device and get current status.
     *
     * GET /api/device-auth/validate
     */
    public function validate(Request $request): JsonResponse
    {
        $device = $request->device;
        $user = $request->authenticated_user;

        return response()->json([
            'status' => $device->status,
            'token_expires_at' => $device->token_expires_at->toIso8601String(),
            'token_expires_in_days' => $device->tokenExpiresInDays(),
            'user' => new UserProfileResource($user),
            'distribution_center' => $device->distributionCenter
                ? new DistributionCenterResource($device->distributionCenter)
                : null,
            'permissions' => $user->getPermissionsArray(),
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get user profile.
     *
     * GET /api/device-auth/profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->authenticated_user;
        $device = $request->device;

        return response()->json([
            'user' => new UserProfileResource($user),
            'distribution_center' => $device->distributionCenter
                ? new DistributionCenterResource($device->distributionCenter)
                : null,
            'permissions' => $user->getPermissionsArray(),
        ]);
    }

    /**
     * Deactivate current device (user-initiated).
     *
     * POST /api/device-auth/deactivate
     */
    public function deactivate(Request $request): JsonResponse
    {
        $result = $this->deviceAuthService->deactivateDevice($request->device);

        return response()->json($result);
    }
}
```

### 8.2 Device Management Controller (Admin)

```bash
php artisan make:controller Api/Admin/DeviceManagementController
```

```php
<?php
// app/Http/Controllers/Api/Admin/DeviceManagementController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeviceResource;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DeviceManagementController extends Controller
{
    /**
     * List all devices with filtering.
     *
     * GET /api/admin/devices
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Device::with(['user', 'distributionCenter']);

        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('distribution_center_id')) {
            $query->where('distribution_center_id', $request->distribution_center_id);
        }

        if ($request->has('inactive_days')) {
            $query->inactive((int) $request->inactive_days);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('device_name', 'like', "%{$search}%")
                    ->orWhere('device_id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'last_seen_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        return DeviceResource::collection(
            $query->paginate($request->get('per_page', 20))
        );
    }

    /**
     * Get device details.
     *
     * GET /api/admin/devices/{device}
     */
    public function show(Device $device): DeviceResource
    {
        $device->load(['user', 'distributionCenter', 'auditLogs' => function ($q) {
            $q->latest()->limit(50);
        }]);

        return new DeviceResource($device);
    }

    /**
     * Suspend a device.
     *
     * PATCH /api/admin/devices/{device}/suspend
     */
    public function suspend(Request $request, Device $device): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($device->isRevoked()) {
            return response()->json([
                'error' => 'device_already_revoked',
                'message' => 'Cannot suspend a revoked device',
            ], 400);
        }

        $device->suspend(
            reason: $request->reason,
            performer: $request->user()
        );

        return response()->json([
            'message' => 'Device suspended successfully',
            'device' => new DeviceResource($device->fresh()),
        ]);
    }

    /**
     * Reactivate a suspended device.
     *
     * PATCH /api/admin/devices/{device}/reactivate
     */
    public function reactivate(Request $request, Device $device): JsonResponse
    {
        if ($device->isRevoked()) {
            return response()->json([
                'error' => 'device_revoked',
                'message' => 'Cannot reactivate a revoked device',
            ], 400);
        }

        if ($device->isActive()) {
            return response()->json([
                'error' => 'device_already_active',
                'message' => 'Device is already active',
            ], 400);
        }

        $device->reactivate(performer: $request->user());

        return response()->json([
            'message' => 'Device reactivated successfully',
            'device' => new DeviceResource($device->fresh()),
        ]);
    }

    /**
     * Permanently revoke a device.
     *
     * DELETE /api/admin/devices/{device}
     */
    public function revoke(Request $request, Device $device): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $device->revoke(
            reason: $request->reason,
            performer: $request->user()
        );

        return response()->json([
            'message' => 'Device revoked successfully',
        ]);
    }

    /**
     * Get device statistics.
     *
     * GET /api/admin/devices/stats
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total' => Device::count(),
            'active' => Device::active()->count(),
            'suspended' => Device::suspended()->count(),
            'revoked' => Device::revoked()->count(),
            'with_expired_token' => Device::active()->withExpiredToken()->count(),
            'inactive_30_days' => Device::active()->inactive(30)->count(),
        ]);
    }
}
```

---

## 9. Routes

### 9.1 API Routes

```php
<?php
// routes/api.php

use App\Http\Controllers\Api\DeviceAuthController;
use App\Http\Controllers\Api\Admin\DeviceManagementController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Device Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('device-auth')->group(function () {
    // Public endpoints (rate limited)
    Route::middleware(['throttle:device-activation'])->group(function () {
        Route::post('/activate', [DeviceAuthController::class, 'activate']);
    });

    Route::middleware(['throttle:device-refresh'])->group(function () {
        Route::post('/refresh', [DeviceAuthController::class, 'refresh']);
    });

    // Authenticated endpoints (device token required)
    Route::middleware(['device.auth'])->group(function () {
        Route::get('/validate', [DeviceAuthController::class, 'validate']);
        Route::get('/profile', [DeviceAuthController::class, 'profile']);
        Route::post('/deactivate', [DeviceAuthController::class, 'deactivate']);
    });
});

/*
|--------------------------------------------------------------------------
| Admin Device Management Routes
|--------------------------------------------------------------------------
*/
Route::prefix('admin/devices')
    ->middleware(['auth:sanctum', 'can:manage-devices'])
    ->group(function () {
        Route::get('/stats', [DeviceManagementController::class, 'stats']);
        Route::get('/', [DeviceManagementController::class, 'index']);
        Route::get('/{device}', [DeviceManagementController::class, 'show']);
        Route::patch('/{device}/suspend', [DeviceManagementController::class, 'suspend']);
        Route::patch('/{device}/reactivate', [DeviceManagementController::class, 'reactivate']);
        Route::delete('/{device}', [DeviceManagementController::class, 'revoke']);
    });
```

### 9.2 Rate Limiting Configuration

```php
<?php
// bootstrap/app.php (Laravel 11) or app/Providers/RouteServiceProvider.php (Laravel 10)

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// In boot method or withRouting callback:
RateLimiter::for('device-activation', function ($request) {
    $config = config('device-auth.rate_limits.activation');
    return Limit::perMinutes($config['decay_minutes'], $config['attempts'])
        ->by($request->ip());
});

RateLimiter::for('device-refresh', function ($request) {
    $config = config('device-auth.rate_limits.refresh');
    return Limit::perMinutes($config['decay_minutes'], $config['attempts'])
        ->by($request->input('device_token', $request->ip()));
});
```

---

## 10. Admin Management

### 10.1 Admin UI Considerations

If using Laravel Nova, Filament, or custom admin panel, create resources for:

1. **Device List View**
   - Columns: Device Name, User, Status, Last Seen, Token Expiry
   - Filters: Status, User, Distribution Center, Inactive period
   - Actions: Suspend, Reactivate, Revoke

2. **Device Detail View**
   - Device info, User info, Distribution Center
   - Audit log timeline
   - Action buttons

3. **Dashboard Widget**
   - Device statistics (total, active, suspended, expired tokens)
   - Inactive devices alert

### 10.2 Artisan Commands (Optional)

```bash
php artisan make:command CleanupExpiredDevices
```

```php
<?php
// app/Console/Commands/CleanupExpiredDevices.php

namespace App\Console\Commands;

use App\Models\Device;
use Illuminate\Console\Command;

class CleanupExpiredDevices extends Command
{
    protected $signature = 'devices:cleanup
        {--days=180 : Revoke devices inactive for this many days}
        {--dry-run : Show what would be cleaned up without doing it}';

    protected $description = 'Cleanup inactive devices';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $dryRun = $this->option('dry-run');

        $query = Device::active()->inactive($days);
        $count = $query->count();

        $this->info("Found {$count} devices inactive for {$days}+ days");

        if ($count === 0) {
            return Command::SUCCESS;
        }

        if ($dryRun) {
            $this->table(
                ['ID', 'Device Name', 'User', 'Last Seen'],
                $query->with('user')->get()->map(fn ($d) => [
                    $d->id,
                    $d->device_name,
                    $d->user->email,
                    $d->last_seen_at->diffForHumans(),
                ])
            );
            return Command::SUCCESS;
        }

        if (!$this->confirm("Revoke {$count} inactive devices?")) {
            return Command::SUCCESS;
        }

        $query->each(function (Device $device) {
            $device->revoke('Automated cleanup - inactive');
        });

        $this->info("Revoked {$count} devices");

        return Command::SUCCESS;
    }
}
```

Schedule in `routes/console.php` or `app/Console/Kernel.php`:

```php
Schedule::command('devices:cleanup --days=180')->weekly();
```

---

## 11. Events & Notifications

### 11.1 Events (Optional)

```php
<?php
// app/Events/DeviceActivated.php

namespace App\Events;

use App\Models\Device;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeviceActivated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Device $device
    ) {}
}

// Similar events: DeviceSuspended, DeviceRevoked
```

### 11.2 Notifications (Optional)

```php
<?php
// app/Notifications/NewDeviceActivated.php

namespace App\Notifications;

use App\Models\Device;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDeviceActivated extends Notification
{
    use Queueable;

    public function __construct(
        public Device $device
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Device Activated')
            ->line("A new device was activated for your account.")
            ->line("Device: {$this->device->device_name}")
            ->line("IP Address: {$this->device->last_ip}")
            ->line("If this wasn't you, please contact support immediately.");
    }
}
```

---

## 12. Testing

### 12.1 Feature Tests

```bash
php artisan make:test DeviceAuthTest
```

```php
<?php
// tests/Feature/DeviceAuthTest.php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Device;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_activate_device(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
            'can_use_mobile_app' => true,
        ]);

        $response = $this->postJson('/api/device-auth/activate', [
            'email' => $user->email,
            'password' => 'password',
            'device_id' => fake()->uuid(),
            'device_name' => 'Test Device',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'device_token',
                'refresh_token',
                'token_expires_at',
                'user' => ['id', 'email', 'name'],
                'permissions',
            ]);

        $this->assertDatabaseHas('devices', [
            'user_id' => $user->id,
            'status' => 'active',
        ]);
    }

    public function test_invalid_credentials_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/device-auth/activate', [
            'email' => $user->email,
            'password' => 'wrong-password',
            'device_id' => fake()->uuid(),
        ]);

        $response->assertStatus(401)
            ->assertJson(['error' => 'invalid_credentials']);
    }

    public function test_device_token_refresh(): void
    {
        $user = User::factory()->create();
        $device = Device::factory()->create([
            'user_id' => $user->id,
            'token_expires_at' => now()->addDay(),
            'refresh_expires_at' => now()->addMonth(),
        ]);

        // Get the original unhashed tokens from factory
        $deviceToken = 'test-device-token';
        $refreshToken = 'test-refresh-token';

        $device->update([
            'device_token' => hash('sha256', $deviceToken),
            'refresh_token' => hash('sha256', $refreshToken),
        ]);

        $response = $this->postJson('/api/device-auth/refresh', [
            'device_token' => $deviceToken,
            'refresh_token' => $refreshToken,
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'device_token',
                'refresh_token',
                'token_expires_at',
            ]);
    }

    public function test_validate_returns_user_profile(): void
    {
        $user = User::factory()->create();
        $deviceToken = 'valid-token';

        $device = Device::factory()->create([
            'user_id' => $user->id,
            'device_token' => hash('sha256', $deviceToken),
            'status' => 'active',
            'token_expires_at' => now()->addDays(30),
        ]);

        $response = $this->getJson('/api/device-auth/validate', [
            'X-Device-Token' => $deviceToken,
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'token_expires_at',
                'user' => ['id', 'email', 'name'],
                'permissions',
            ]);
    }

    public function test_revoked_device_cannot_access(): void
    {
        $user = User::factory()->create();
        $deviceToken = 'revoked-token';

        Device::factory()->create([
            'user_id' => $user->id,
            'device_token' => hash('sha256', $deviceToken),
            'status' => 'revoked',
        ]);

        $response = $this->getJson('/api/device-auth/validate', [
            'X-Device-Token' => $deviceToken,
        ]);

        $response->assertStatus(403)
            ->assertJson(['error' => 'device_revoked']);
    }

    public function test_device_limit_enforced(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
            'max_devices' => 2,
        ]);

        // Create 2 active devices
        Device::factory()->count(2)->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/device-auth/activate', [
            'email' => $user->email,
            'password' => 'password',
            'device_id' => fake()->uuid(),
        ]);

        $response->assertStatus(409)
            ->assertJson(['error' => 'device_limit_reached']);
    }
}
```

### 12.2 Device Factory

```bash
php artisan make:factory DeviceFactory
```

```php
<?php
// database/factories/DeviceFactory.php

namespace Database\Factories;

use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeviceFactory extends Factory
{
    protected $model = Device::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'device_id' => $this->faker->uuid(),
            'device_name' => $this->faker->randomElement(['iPhone', 'iPad', 'Android Tablet', 'Warehouse Scanner']),
            'device_token' => hash('sha256', bin2hex(random_bytes(32))),
            'refresh_token' => hash('sha256', bin2hex(random_bytes(32))),
            'token_expires_at' => now()->addDays(30),
            'refresh_expires_at' => now()->addDays(90),
            'last_seen_at' => now(),
            'last_ip' => $this->faker->ipv4(),
            'status' => 'active',
        ];
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }

    public function revoked(): static
    {
        return $this->state(['status' => 'revoked']);
    }

    public function expired(): static
    {
        return $this->state([
            'token_expires_at' => now()->subDay(),
        ]);
    }
}
```

---

## 13. Deployment Checklist

### Pre-Deployment

- [ ] Run migrations on staging/production
- [ ] Set environment variables
- [ ] Configure rate limiting
- [ ] Review CORS settings for PWA domain
- [ ] Set up monitoring/logging for auth failures

### CORS Configuration

```php
<?php
// config/cors.php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
        env('PWA_URL', 'https://local-flowbin.example.com'),
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

### Post-Deployment

- [ ] Test activation flow end-to-end
- [ ] Verify token refresh works
- [ ] Test admin device management
- [ ] Set up automated cleanup job
- [ ] Monitor audit logs

---

## Quick Reference

### Service Provider Registration

```php
<?php
// app/Providers/AppServiceProvider.php

public function register(): void
{
    $this->app->singleton(DeviceTokenService::class);
    $this->app->singleton(DeviceAuthService::class);
}
```

### Files Created Summary

```
config/device-auth.php
database/migrations/xxxx_create_devices_table.php
database/migrations/xxxx_create_device_audit_logs_table.php
database/migrations/xxxx_add_mobile_access_to_users_table.php
database/factories/DeviceFactory.php
app/Models/Device.php
app/Models/DeviceAuditLog.php
app/Services/DeviceTokenService.php
app/Services/DeviceAuthService.php
app/Http/Requests/DeviceActivationRequest.php
app/Http/Requests/DeviceRefreshRequest.php
app/Http/Resources/UserProfileResource.php
app/Http/Resources/DeviceResource.php
app/Http/Resources/DistributionCenterResource.php
app/Http/Middleware/DeviceAuthentication.php
app/Http/Controllers/Api/DeviceAuthController.php
app/Http/Controllers/Api/Admin/DeviceManagementController.php
app/Console/Commands/CleanupExpiredDevices.php
tests/Feature/DeviceAuthTest.php
```
