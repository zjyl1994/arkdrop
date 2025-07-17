package service

import (
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
