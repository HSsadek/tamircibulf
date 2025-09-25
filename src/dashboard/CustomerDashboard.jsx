import React from 'react';

export default function CustomerDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Müşteri Paneli</h1>
        <div className="flex gap-2">
          <a href="#/app?role=customer" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Servis Bul</a>
          <button className="px-3 py-1.5 rounded-md border hover:bg-gray-50" onClick={() => (window.location.hash = '#/')}>Çıkış</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Açık Talepler</div>
          <div className="text-2xl font-semibold">2</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Tamamlanan</div>
          <div className="text-2xl font-semibold">5</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Bekleyen Mesaj</div>
          <div className="text-2xl font-semibold">1</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Son Talepler</h2>
          <div className="divide-y rounded-lg border bg-white">
            {[
              { id: 1, title: 'Buzdolabı soğutmuyor', status: 'Bekliyor', date: '24 Eyl 2025' },
              { id: 2, title: 'Çamaşır makinesi su almıyor', status: 'Tamamlandı', date: '12 Eyl 2025' },
            ].map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-gray-500">{r.date}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">{r.status}</span>
              </div>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-lg font-semibold mb-3">Profil Özeti</h2>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-gray-500">Ad Soyad</div>
            <div className="font-medium mb-2">Demo Kullanıcı</div>
            <div className="text-sm text-gray-500">E-posta</div>
            <div className="font-medium mb-4">demo@mail.com</div>
            <a href="#/auth/customer" className="px-3 py-1.5 rounded-md border hover:bg-gray-50 inline-block">Profili Düzenle</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
