'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  Alert,
  FormHelperText,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';

interface FormData {
  name: string;
  email: string;
  phone: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export default function InputPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    category: '',
    description: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อ';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'กรุณากรอกอีเมล';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'เบอร์โทรศัพท์ต้องมี 10 หลัก';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'กรุณาเลือกหมวดหมู่';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'กรุณากรอกคำอธิบาย';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('บันทึกข้อมูลสำเร็จ!');
        router.push('/');
      } else {
        throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
          เพิ่มข้อมูลใหม่
        </Typography>
        <Typography variant="body1" color="text.secondary">
          กรอกข้อมูลด้านล่างเพื่อเพิ่มรายการใหม่
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Name Field */}
              <TextField
                label="ชื่อ"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="กรอกชื่อของคุณ"
                sx={{ flex: 1, minWidth: 250 }}
              />

              {/* Email Field */}
              <TextField
                label="อีเมล"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                placeholder="example@email.com"
                sx={{ flex: 1, minWidth: 250 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Phone Field */}
              <TextField
                label="เบอร์โทรศัพท์"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
                placeholder="0812345678"
                sx={{ flex: 1, minWidth: 250 }}
              />

              {/* Category Field */}
              <FormControl required error={!!errors.category} sx={{ flex: 1, minWidth: 250 }}>
                <InputLabel>หมวดหมู่</InputLabel>
                <Select
                  value={formData.category}
                  label="หมวดหมู่"
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  <MenuItem value="">เลือกหมวดหมู่</MenuItem>
                  <MenuItem value="technical">เทคนิค</MenuItem>
                  <MenuItem value="support">สนับสนุน</MenuItem>
                  <MenuItem value="billing">การเรียกเก็บเงิน</MenuItem>
                  <MenuItem value="general">ทั่วไป</MenuItem>
                </Select>
                {errors.category && (
                  <FormHelperText>{errors.category}</FormHelperText>
                )}
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {/* Priority Field */}
              <FormControl sx={{ flex: 1, minWidth: 250 }}>
                <InputLabel>ความสำคัญ</InputLabel>
                <Select
                  value={formData.priority}
                  label="ความสำคัญ"
                  onChange={(e) => handleInputChange('priority', e.target.value as FormData['priority'])}
                >
                  <MenuItem value="low">ต่ำ</MenuItem>
                  <MenuItem value="medium">ปานกลาง</MenuItem>
                  <MenuItem value="high">สูง</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Description Field */}
            <TextField
              fullWidth
              label="คำอธิบาย"
              multiline
              rows={4}
              required
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              placeholder="กรอกรายละเอียดเพิ่มเติม..."
            />
          </Stack>

          {/* Submit Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/')}
              sx={{ textTransform: 'none' }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isSubmitting}
              sx={{ textTransform: 'none' }}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
} 