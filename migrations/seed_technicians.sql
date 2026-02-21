-- Seed Technicians Table with Existing Personnel Names
-- Placeholder numbers: 620000000001 - 620000000026
-- You can edit these numbers in the "Manajemen Teknisi" dashboard

INSERT INTO public.technicians (name, whatsapp_number)
VALUES 
    ('Galih', '620000000001'),
    ('Eko', '620000000002'),
    ('Agus', '620000000003'),
    ('Bokir', '620000000004'),
    ('Ahmad Sunar', '620000000027'),
    ('Siti', '620000000005'),
    ('Budi', '620000000006'),
    ('Ani', '620000000007'),
    ('Doni', '620000000008'),
    ('Rina', '620000000009'),
    ('Joko', '620000000010'),
    ('Tono', '620000000011'),
    ('Lisa', '620000000012'),
    ('Rudi', '620000000013'),
    ('Maya', '620000000014'),
    ('Bayu', '620000000015'),
    ('Dewi', '620000000016'),
    ('Putra', '620000000017'),
    ('Putri', '620000000018'),
    ('Dian', '620000000019'),
    ('Rizky', '620000000020'),
    ('Fajar', '620000000021'),
    ('Nur', '620000000022'),
    ('Sari', '620000000023'),
    ('Hendi', '620000000024'),
    ('Yanto', '620000000025'),
    ('Wawan', '620000000026')
ON CONFLICT (whatsapp_number) DO NOTHING;
