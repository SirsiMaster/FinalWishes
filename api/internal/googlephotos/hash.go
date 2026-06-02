package googlephotos

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
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

func extractJPEGEXIF(data []byte) map[string]interface{} {
	if len(data) < 4 || data[0] != 0xff || data[1] != 0xd8 {
		return nil
	}
	for i := 2; i+4 < len(data); {
		if data[i] != 0xff {
			return nil
		}
		marker := data[i+1]
		if marker == 0xda || marker == 0xd9 {
			return nil
		}
		size := int(data[i+2])<<8 | int(data[i+3])
		if size < 2 || i+2+size > len(data) {
			return nil
		}
		segment := data[i+4 : i+2+size]
		if marker == 0xe1 && len(segment) > 6 && string(segment[:6]) == "Exif\x00\x00" {
			return map[string]interface{}{
				"format": "jpeg-app1-exif",
				"bytes":  base64.StdEncoding.EncodeToString(segment),
			}
		}
		i += 2 + size
	}
	return nil
}
