package service

import (
	"fmt"
	"time"
)

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	Active    bool      `json:"active"`
}

func NewUser(name, email string) *User {
	return &User{
		Name:      name,
		Email:     email,
		CreatedAt: time.Now(),
		Active:    true,
	}
}

func (u *User) String() string {
	return fmt.Sprintf("User{ID: %d, Name: %s, Email: %s}", u.ID, u.Name, u.Email)
}

func (u *User) IsValidEmail() bool {
	return len(u.Email) > 0 && 
		   contains(u.Email, "@") && 
		   contains(u.Email, ".")
}

func (u *User) GetDisplayName() string {
	if u.Name != "" {
		return u.Name
	}
	return "Unknown User"
}

func (u *User) Deactivate() {
	u.Active = false
}

func (u *User) Activate() {
	u.Active = true
}

// Helper function
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

type UserFilter struct {
	Active   *bool
	MinID    *int64
	MaxID    *int64
	NameLike string
}

func (f *UserFilter) Matches(user *User) bool {
	if f.Active != nil && user.Active != *f.Active {
		return false
	}
	if f.MinID != nil && user.ID < *f.MinID {
		return false
	}
	if f.MaxID != nil && user.ID > *f.MaxID {
		return false
	}
	if f.NameLike != "" && !contains(user.Name, f.NameLike) {
		return false
	}
	return true
}
