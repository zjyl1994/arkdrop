package service

import (
	"os"
	"path/filepath"
	"time"

	"github.com/zjyl1994/picotransfer/vars"
	"gorm.io/gorm"
)

type ParcelService struct{}

func (ParcelService) Create(parcel Parcel, attachments []Attachment) error {
	return vars.DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Create(&parcel).Error
		if err != nil {
			return err
		}
		for i := range attachments {
			attachments[i].ParcelID = parcel.ID
		}
		return tx.CreateInBatches(&attachments, 10).Error
	})
}

func (ParcelService) Delete(id int) error {
	var fileList []Attachment
	err := vars.DB.Where("parcel_id = ?", id).Find(&fileList).Error
	if err != nil {
		return err
	}
	for _, file := range fileList {
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
		return tx.Where("parcel_id = ?", id).Delete(&Attachment{}).Error
	})
}

func (ParcelService) Clean() error {
	dataFolder := filepath.Join(vars.DataDir, "files")
	err := filepath.WalkDir(dataFolder, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == dataFolder {
			return nil
		}
		return os.RemoveAll(path)
	})
	if err != nil {
		return err
	}
	return vars.DB.Transaction(func(tx *gorm.DB) error {
		tx = tx.Session(&gorm.Session{AllowGlobalUpdate: true})
		err := tx.Delete(&Parcel{}).Error
		if err != nil {
			return err
		}
		return tx.Delete(&Attachment{}).Error
	})
}

func (ParcelService) List() ([]Parcel, error) {
	var parcels []Parcel
	err := vars.DB.Preload("Attachments").Order("CASE WHEN favorite = 1 THEN 0 ELSE 1 END").
		Order("created_at DESC").Find(&parcels).Error
	if err != nil {
		return nil, err
	}
	return parcels, nil
}

func (ParcelService) Favorite(id int) error {
	return vars.DB.Model(&Parcel{}).Where("id = ?", id).Update("favorite", gorm.Expr("NOT favorite")).Error
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
