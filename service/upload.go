package service

import (
	"time"

	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// AttachmentUpload returns a completed upload so a retry can skip resending its bytes.
func (ParcelService) AttachmentUpload(parcelID int, key string) (Attachment, error) {
	var attachment Attachment
	err := vars.DB.Where("parcel_id = ? AND upload_key = ?", parcelID, key).First(&attachment).Error
	return attachment, err
}

// AddAttachmentOnce commits the upload key and attachment together. Concurrent retries
// may save a temporary disk file, but only one becomes the persisted attachment.
func (ParcelService) AddAttachmentOnce(parcelID int, attachment Attachment) (Attachment, bool, error) {
	reused := false
	err := vars.DB.Transaction(func(tx *gorm.DB) error {
		var parcel Parcel
		if err := tx.First(&parcel, parcelID).Error; err != nil {
			return err
		}
		if !parcel.Favorite && vars.AutoExpire > 0 && parcel.CreatedAt+int64(vars.AutoExpire.Seconds()) <= time.Now().Unix() {
			return gorm.ErrRecordNotFound
		}
		attachment.ParcelID = parcelID
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&attachment)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			reused = true
			var existing Attachment
			if err := tx.Where("parcel_id = ? AND upload_key = ?", parcelID, *attachment.UploadKey).First(&existing).Error; err != nil {
				return err
			}
			attachment = existing
			return nil
		}
		return tx.Model(&parcel).Update("updated_at", time.Now().Unix()).Error
	})
	return attachment, reused, err
}
