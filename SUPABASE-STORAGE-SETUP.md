# Supabase Storage Bucket Setup

## Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Enter the following details:
   - **Name**: `check-in-photos`
   - **Public bucket**: ✅ **Enable** (so photos are publicly accessible)
   - **File size limit**: 5 MB (optional)
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png` (optional)

5. Click **"Create bucket"**

## Set Bucket Policies (Important!)

After creating the bucket, you need to set up policies to allow:
- **Authenticated users** to upload photos
- **Public** to read/view photos

### Policy 1: Allow Authenticated Upload

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'check-in-photos');
```

### Policy 2: Allow Public Read

```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'check-in-photos');
```

## Verify Setup

1. Go to **Storage** > **check-in-photos**
2. Try uploading a test image manually
3. Click on the image and copy the public URL
4. Open the URL in a new tab - it should display the image

## Folder Structure

Photos will be automatically organized as:
```
check-in-photos/
  └── {session_id}/
      ├── {employee_id}_1234567890.jpg
      ├── {employee_id}_1234567891.jpg
      └── ...
```

This keeps photos organized by session for easy management.
