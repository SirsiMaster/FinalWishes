package googlephotos

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"image"
	_ "image/jpeg"
	_ "image/png"
)

func sha256Hex(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func averageDHash(data []byte) string {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return ""
	}
	b := img.Bounds()
	if b.Dx() == 0 || b.Dy() == 0 {
		return ""
	}
	var total uint64
	var samples [64]uint8
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			px := b.Min.X + x*b.Dx()/8
			py := b.Min.Y + y*b.Dy()/8
			r, g, bl, _ := img.At(px, py).RGBA()
			luma := uint8(((r >> 8) + (g >> 8) + (bl >> 8)) / 3)
			samples[y*8+x] = luma
			total += uint64(luma)
		}
	}
	avg := uint8(total / 64)
	var bits uint64
	for i, v := range samples {
		if v >= avg {
			bits |= 1 << uint(63-i)
		}
	}
	return hex.EncodeToString([]byte{
		byte(bits >> 56), byte(bits >> 48), byte(bits >> 40), byte(bits >> 32),
		byte(bits >> 24), byte(bits >> 16), byte(bits >> 8), byte(bits),
	})
}

// NOTE: raw JPEG EXIF extraction was removed deliberately. EXIF APP1 segments
// carry GPS coordinates, device identifiers, and timestamps; persisting them in
// the client-readable Firestore heirloom document violated PII siloing
// (CLAUDE.md Rule 26). The original photo bytes (with EXIF intact) remain in the
// vault storage object; only sanitized fields are stored in Firestore.
