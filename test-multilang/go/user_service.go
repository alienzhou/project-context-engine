package service

import (
	"context"
	"errors"
)

type UserService struct {
	userRepo UserRepository
}

func NewUserService(userRepo UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

func (s *UserService) FindByID(ctx context.Context, id int64) (*User, error) {
	return s.userRepo.FindByID(ctx, id)
}

func (s *UserService) FindAll(ctx context.Context) ([]*User, error) {
	return s.userRepo.FindAll(ctx)
}

func (s *UserService) CreateUser(ctx context.Context, name, email string) (*User, error) {
	if name == "" || email == "" {
		return nil, errors.New("name and email are required")
	}
	
	user := &User{
		Name:  name,
		Email: email,
	}
	
	return s.userRepo.Save(ctx, user)
}
