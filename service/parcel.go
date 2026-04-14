package service

import (
	"os"
	"path/filepath"
	"time"

	"github.com/zjyl1994/arkdrop/vars"
	"gorm.io/gorm"
)

type ParcelService struct{}

func (ParcelService) Create(parcel Parcel) (Parcel, error) {
	err := vars.DB.Create(&parcel).Error
	return parcel, err
}

func (ParcelService) AddAttachments(parcelID int, attachments []Attachment) error {
	if len(attachments) == 0 {
		return nil
	}

	return vars.DB.Transaction(func(tx *gorm.DB) error {
		var parcel Parcel
		if err := tx.First(&parcel, parcelID).Error; err != nil {
			return err
		}

		for i := range attachments {
			attachments[i].ParcelID = parcel.ID
		}

		if err := tx.CreateInBatches(&attachments, 10).Error; err != nil {
			return err
		}

		return tx.Model(&parcel).Update("updated_at", time.Now().Unix()).Error
	})
}

func (ParcelService) Delete(id int) error {
	var fileList []Attachment
	err := vars.DB.Where("parcel_id = ?", id).Find(&fileList).Error
	if err != nil {
		return err
	}
	attachmentIDs := make([]int, 0, len(fileList))
	for _, file := range fileList {
		attachmentIDs = append(attachmentIDs, file.ID)
		diskPath := filepath.Join(vars.DataDir, "files", file.FilePath)
		err := os.Remove(diskPath)
		if err != nil {
			return err
		}
	}

	return vars.DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Delete(&Parcel{}, id).Error
		if err != nil {
			return err
		}
		if len(attachmentIDs) > 0 {
			if err := tx.Where("attachment_id IN ?", attachmentIDs).Delete(&AttachmentShare{}).Error; err != nil {
				return err
			}
		}
		return tx.Where("parcel_id = ?", id).Delete(&Attachment{}).Error
	})
}

func (s ParcelService) Clean(favorite bool) error {
	var parcels []Parcel
	err := vars.DB.Select("id").Where("favorite = ?", favorite).Find(&parcels).Error
	if err != nil {
		return err
	}

	for _, parcel := range parcels {
		if err := s.Delete(parcel.ID); err != nil {
			return err
		}
	}

	return nil
}

func (ParcelService) List(favorite *bool) ([]Parcel, error) {
	var parcels []Parcel
	query := vars.DB.Preload("Attachments")
	if favorite != nil {
		query = query.Where("favorite = ?", *favorite)
	}

	err := query.Order("created_at DESC").Find(&parcels).Error
	if err != nil {
		return nil, err
	}
	return parcels, nil
}

func (ParcelService) Favorite(id int) error {
	return vars.DB.Model(&Parcel{}).Where("id = ?", id).Updates(map[string]interface{}{
		"favorite":   gorm.Expr("NOT favorite"),
		"updated_at": time.Now().Unix(),
	}).Error
}

func (s ParcelService) CleanExpired() error {
	var expiredParcels []Parcel
	err := vars.DB.Where("favorite = ?", false).Where("created_at < ?", time.Now().Add(-vars.AutoExpire).Unix()).Find(&expiredParcels).Error
	if err != nil {
		return err
	}
	for _, parcel := range expiredParcels {
		err := s.Delete(parcel.ID)
		if err != nil {
			return err
		}
	}
	return nil
}
