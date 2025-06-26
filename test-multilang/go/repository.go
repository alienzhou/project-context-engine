package service

import (
	"context"
	"errors"
	"sync"
)

type UserRepository interface {
	FindByID(ctx context.Context, id int64) (*User, error)
	FindAll(ctx context.Context) ([]*User, error)
	FindByFilter(ctx context.Context, filter *UserFilter) ([]*User, error)
	Save(ctx context.Context, user *User) (*User, error)
	Delete(ctx context.Context, id int64) error
	ExistsById(ctx context.Context, id int64) (bool, error)
	Count(ctx context.Context) (int64, error)
}

type InMemoryUserRepository struct {
	users  map[int64]*User
	nextID int64
	mutex  sync.RWMutex
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users:  make(map[int64]*User),
		nextID: 1,
	}
}

func (r *InMemoryUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	user, exists := r.users[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (r *InMemoryUserRepository) FindAll(ctx context.Context) ([]*User, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	users := make([]*User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, user)
	}
	return users, nil
}

func (r *InMemoryUserRepository) FindByFilter(ctx context.Context, filter *UserFilter) ([]*User, error) {
	all, err := r.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	
	var filtered []*User
	for _, user := range all {
		if filter.Matches(user) {
			filtered = append(filtered, user)
		}
	}
	return filtered, nil
}

func (r *InMemoryUserRepository) Save(ctx context.Context, user *User) (*User, error) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if user.ID == 0 {
		user.ID = r.nextID
		r.nextID++
	}
	
	r.users[user.ID] = user
	return user, nil
}

func (r *InMemoryUserRepository) Delete(ctx context.Context, id int64) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if _, exists := r.users[id]; !exists {
		return errors.New("user not found")
	}
	
	delete(r.users, id)
	return nil
}

func (r *InMemoryUserRepository) ExistsById(ctx context.Context, id int64) (bool, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	_, exists := r.users[id]
	return exists, nil
}

func (r *InMemoryUserRepository) Count(ctx context.Context) (int64, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	return int64(len(r.users)), nil
}
