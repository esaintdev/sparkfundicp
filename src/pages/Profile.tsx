import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { profile, updateProfile, loading } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    isCreator: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        isCreator: profile.is_creator || false
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      name: form.name,
      email: form.email,
      is_creator: form.isCreator
    });
    setSaving(false);
    if (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.'
      });
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View and edit your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isCreator"
              name="isCreator"
              checked={form.isCreator}
              onCheckedChange={checked => setForm(prev => ({ ...prev, isCreator: checked as boolean }))}
            />
            <Label htmlFor="isCreator" className="text-sm">
              I want to create campaigns and receive donations
            </Label>
          </div>
          <Button onClick={handleSave} className="w-full bg-gradient-primary hover:bg-gradient-primary/90" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 