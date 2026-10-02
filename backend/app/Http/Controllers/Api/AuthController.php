<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FamilyProfile;
use App\Models\RescueUnit;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status === 'inactive') {
            return response()->json(['message' => 'Your account is deactivated. Please contact an administrator.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'user' => $user,
        ]);
    }

    public function registerFamily(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'headcount' => 'required|integer|min:1',
            'contact_number' => ['required', 'string', 'regex:/^\+?[0-9\s\-]+$/'],
            'barangay' => 'required|string',
            'transportation_mode' => 'required|in:pedestrian,2_wheel,4_wheel',
        ]);

        DB::beginTransaction();
        try {
            $qrHash = 'hash_'.bin2hex(random_bytes(8));
            $dummyEmail = 'resident_'.time().'_'.Str::random(5).'@evacroute.local';

            $user = User::create([
                'name' => $validated['name'],
                'email' => $dummyEmail,
                'password' => Hash::make(Str::random(16)), // Secure but unused by resident
                'role' => 'resident',
            ]);

            $family = FamilyProfile::create([
                'user_id' => $user->id,
                'headcount' => $validated['headcount'],
                'contact_number' => $validated['contact_number'],
                'barangay' => $validated['barangay'],
                'transportation_mode' => $validated['transportation_mode'],
                'qr_code_hash' => $qrHash,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            DB::commit();

            return response()->json([
                'access_token' => $token,
                'qr_code_hash' => $qrHash,
                'user' => $user,
                'family' => $family,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Family registration failed: '.$e->getMessage());

            return response()->json(['message' => 'Registration failed. Please try again.'], 500);
        }
    }

    public function getStaff(Request $request)
    {
        $query = User::with([
            'rescueUnits:id,name,call_sign,unit_type,status,assigned_personnel_id',
            'assignedRescueUnit:id,name,call_sign,unit_type,status,capacity_persons,contact_number',
            'assignedShelter:id,name,barangay,status,max_capacity,current_occupancy'
        ])
            ->whereIn('role', ['admin', 'lgu_staff']);

        $agency = $request->query('agency');
        if ($agency === 'cdrmo') {
            $query->where(function ($q) {
                $q->whereIn('operator_type', ['general', 'rescue'])
                  ->orWhere('role', 'admin');
            });
        } elseif ($agency === 'cswdo') {
            $query->whereIn('operator_type', ['logistics', 'scanner']);
        }

        $staff = $query->orderBy('name')->get();

        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function storeStaff(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,lgu_staff',
            'operator_type' => 'nullable|string|in:admin,general,rescue,scanner,logistics',
            'status' => 'required|in:active,inactive',
            'assigned_rescue_unit_id' => 'nullable|exists:rescue_units,id',
            'assigned_shelter_id' => 'nullable|exists:shelters,id',
            'rescue_role' => 'nullable|string|max:50',
            'create_rescue_unit' => 'nullable|boolean',
            'rescue_unit_name' => 'nullable|required_if:create_rescue_unit,true|string|max:255',
            'rescue_call_sign' => 'nullable|required_if:create_rescue_unit,true|string|max:50|unique:rescue_units,call_sign',
            'rescue_unit_type' => 'nullable|required_if:create_rescue_unit,true|in:water_rescue,medical_ambulance,high_clearance_truck',
            'rescue_capacity' => 'nullable|integer|min:1|max:100',
            'rescue_contact' => 'nullable|string|max:50',
            'existing_rescue_unit_id' => 'nullable|exists:rescue_units,id',
        ]);

        if (($validated['role'] ?? '') === 'admin' || ($validated['operator_type'] ?? '') === 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'System administrator accounts are exempted from operator registration.',
            ], 422);
        }

        $operatorType = $validated['operator_type'] ?? 'general';
        $assignedRescueUnitId = $validated['assigned_rescue_unit_id'] ?? $validated['existing_rescue_unit_id'] ?? null;
        $assignedShelterId = $operatorType === 'scanner' ? ($validated['assigned_shelter_id'] ?? null) : null;
        $rescueRole = $validated['rescue_role'] ?? ($operatorType === 'rescue' ? 'crew' : null);

        $staff = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'operator_type' => $operatorType,
            'assigned_rescue_unit_id' => $assignedRescueUnitId,
            'assigned_shelter_id' => $assignedShelterId,
            'rescue_role' => $rescueRole,
            'status' => $validated['status'],
        ]);

        // If rescue operator and creating a new unit on the fly
        if ($operatorType === 'rescue') {
            if (!empty($validated['create_rescue_unit']) && !empty($validated['rescue_call_sign'])) {
                $newUnit = RescueUnit::create([
                    'name' => $validated['rescue_unit_name'],
                    'call_sign' => strtoupper($validated['rescue_call_sign']),
                    'unit_type' => $validated['rescue_unit_type'] ?? 'water_rescue',
                    'capacity_persons' => $validated['rescue_capacity'] ?? 6,
                    'contact_number' => $validated['rescue_contact'] ?? null,
                    'assigned_personnel_id' => $staff->id,
                    'status' => 'standby',
                    'current_latitude' => 6.9214,
                    'current_longitude' => 122.0790,
                ]);

                $staff->update(['assigned_rescue_unit_id' => $newUnit->id]);
            } elseif ($assignedRescueUnitId) {
                // Link if unit doesn't have assigned_personnel_id
                $unit = RescueUnit::find($assignedRescueUnitId);
                if ($unit && empty($unit->assigned_personnel_id)) {
                    $unit->update(['assigned_personnel_id' => $staff->id]);
                }
            }
        }

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'staff_create',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'id' => $staff->id,
                'name' => $staff->name,
                'email' => $staff->email,
                'role' => $staff->role,
                'operator_type' => $staff->operator_type,
                'assigned_rescue_unit_id' => $staff->assigned_rescue_unit_id,
                'assigned_shelter_id' => $staff->assigned_shelter_id,
                'rescue_role' => $staff->rescue_role,
                'status' => $staff->status,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Staff operator created successfully.',
            'data' => $staff->load(['rescueUnits', 'assignedRescueUnit', 'assignedShelter']),
        ], 201);
    }

    public function updateStaff(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $oldValues = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'operator_type' => $user->operator_type,
            'assigned_rescue_unit_id' => $user->assigned_rescue_unit_id,
            'assigned_shelter_id' => $user->assigned_shelter_id,
            'rescue_role' => $user->rescue_role,
            'status' => $user->status,
        ];

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'required|in:admin,lgu_staff',
            'operator_type' => 'nullable|string|in:admin,general,rescue,scanner,logistics',
            'status' => 'required|in:active,inactive',
            'assigned_rescue_unit_id' => 'nullable|exists:rescue_units,id',
            'assigned_shelter_id' => 'nullable|exists:shelters,id',
            'rescue_role' => 'nullable|string|max:50',
            'existing_rescue_unit_id' => 'nullable|exists:rescue_units,id',
        ]);

        $operatorType = $validated['operator_type'] ?? ($validated['role'] === 'admin' ? 'admin' : ($user->operator_type ?? 'general'));
        if ($validated['role'] === 'admin') {
            $operatorType = 'admin';
        }

        $assignedRescueUnitId = array_key_exists('assigned_rescue_unit_id', $validated)
            ? $validated['assigned_rescue_unit_id']
            : ($validated['existing_rescue_unit_id'] ?? $user->assigned_rescue_unit_id);

        $assignedShelterId = $operatorType === 'scanner'
            ? ($validated['assigned_shelter_id'] ?? $user->assigned_shelter_id)
            : null;

        $rescueRole = array_key_exists('rescue_role', $validated)
            ? $validated['rescue_role']
            : $user->rescue_role;

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'operator_type' => $operatorType,
            'assigned_rescue_unit_id' => $assignedRescueUnitId,
            'assigned_shelter_id' => $assignedShelterId,
            'rescue_role' => $operatorType === 'rescue' ? $rescueRole : null,
            'status' => $validated['status'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if ($operatorType === 'rescue' && !empty($assignedRescueUnitId)) {
            $unit = RescueUnit::find($assignedRescueUnitId);
            if ($unit && empty($unit->assigned_personnel_id)) {
                $unit->update(['assigned_personnel_id' => $user->id]);
            }
        }

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'staff_update',
            'ip_address' => $request->ip(),
            'old_values' => $oldValues,
            'new_values' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'operator_type' => $user->operator_type,
                'assigned_rescue_unit_id' => $user->assigned_rescue_unit_id,
                'assigned_shelter_id' => $user->assigned_shelter_id,
                'rescue_role' => $user->rescue_role,
                'status' => $user->status,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Staff operator updated successfully.',
            'data' => $user->load(['rescueUnits', 'assignedRescueUnit', 'assignedShelter']),
        ]);
    }

    public function deleteStaff($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting yourself
        if (auth()->id() == $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Cannot revoke your own account.'], 400);
        }

        $oldValues = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];

        // Revoke tokens
        $user->tokens()->delete();
        $user->update(['status' => 'inactive']);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'staff_deactivate',
            'ip_address' => request()->ip(),
            'old_values' => $oldValues,
            'new_values' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => 'inactive',
            ],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Staff operator revoked successfully.']);
    }

    /**
     * Store or update the Expo Push Token for the authenticated user.
     * Called on every mobile app launch — idempotent via update().
     * Allows the backend to send server-initiated push notifications via Expo's Push API.
     */
    public function storePushToken(Request $request)
    {
        $validated = $request->validate([
            'push_token' => 'required|string|max:255',
        ]);

        $request->user()->update(['push_token' => $validated['push_token']]);

        return response()->json([
            'status' => 'success',
            'message' => 'Push token registered successfully.',
        ]);
    }

    public function updateLocation(Request $request)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $request->user()->update([
            'last_latitude' => $validated['latitude'],
            'last_longitude' => $validated['longitude'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Location updated successfully.',
        ]);
    }
}
