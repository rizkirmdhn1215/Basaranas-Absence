# Camera Fix Instructions

## Problem
The video ref is null when we try to attach the camera stream because the modal hasn't rendered yet.

## Solution
In file: `app/checkin/page.tsx`

Find this code (around line 109-129):

```tsx
if (videoRef.current) {
    console.log('Attaching stream to video element')
    videoRef.current.srcObject = stream
    streamRef.current = stream
    
    // Wait for video to be ready and play it
    videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded, playing...')
        videoRef.current?.play().then(() => {
            console.log('Video playing successfully')
        }).catch(err => {
            console.error('Error playing video:', err)
        })
    }
    
    setShowCamera(true)
    setError('') // Clear any previous errors
    console.log('Camera modal should be visible now')
} else {
    console.error('Video ref is null!')
}
```

## Replace it with:

```tsx
// Store stream in state - useEffect will attach it to video element
setCameraStream(stream)
setShowCamera(true)
setError('')
console.log('Camera modal should open now, useEffect will attach stream')
```

## Why this works:
1. We store the stream in `cameraStream` state
2. Setting `setShowCamera(true)` renders the modal
3. The `useEffect` (already added at line 56-72) watches for `showCamera` and `cameraStream` changes
4. When both are true, useEffect attaches the stream to the video element AFTER it's rendered
5. This fixes the timing issue!

Save the file and test - the camera should now display!
