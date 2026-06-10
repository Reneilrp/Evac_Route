<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyProfile;
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
            'contact_number' => 'required|string',
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

    public function getStaff()
    {
        $staff = User::whereIn('role', ['admin', 'lgu_staff'])->orderBy('name')->get();

        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function storeStaff(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,lgu_staff',
            'status' => 'required|in:active,inactive',
        ]);

        $staff = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'status' => $validated['status'],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Staff operator created successfully.', 'data' => $staff], 201);
    }

    public function updateStaff(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'required|in:admin,lgu_staff',
            'status' => 'required|in:active,inactive',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'status' => $validated['status'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return response()->json(['status' => 'success', 'message' => 'Staff operator updated successfully.', 'data' => $user]);
    }

    public function deleteStaff($id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting yourself
        if (auth()->id() == $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Cannot revoke your own account.'], 400);
        }

        // Revoke tokens
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['status' => 'success', 'message' => 'Staff operator revoked successfully.']);
    }
}
