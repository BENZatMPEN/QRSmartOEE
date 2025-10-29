import { NextRequest, NextResponse } from 'next/server';

interface FormData {
  name: string;
  email: string;
  phone: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export async function POST(request: NextRequest) {
  try {
    const body: FormData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.phone || !body.category || !body.description) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(body.phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์ต้องมี 10 หลัก' },
        { status: 400 }
      );
    }

    // จำลองการบันทึกลงฐานข้อมูล
    const savedData = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    console.log('Saved data:', savedData);

    // ในที่นี้คุณสามารถเพิ่มโค้ดสำหรับบันทึกลงฐานข้อมูลจริง เช่น MongoDB, PostgreSQL, etc.
    // await db.collection('submissions').insertOne(savedData);

    return NextResponse.json({
      message: 'บันทึกข้อมูลสำเร็จ',
      data: savedData
    });

  } catch (error) {
    console.error('Error submitting data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
} 