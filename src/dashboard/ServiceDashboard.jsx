import React from 'react';

export default function ServiceDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Servis Paneli</h1>
        <div className="flex gap-2">
          <a href="#/app?role=service" className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Talepleri Gör</a>
          <button className="px-3 py-1.5 rounded-md border hover:bg-gray-50" onClick={() => (window.location.hash = '#/')}>Çıkış</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Aktif İş</div>
          <div className="text-2xl font-semibold">3</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Bekleyen Teklif</div>
          <div className="text-2xl font-semibold">4</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Tamamlanan</div>
          <div className="text-2xl font-semibold">12</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Puan (Ortalama)</div>
          <div className="text-2xl font-semibold">4.7</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">İş Kuyruğu</h2>
          <div className="divide-y rounded-lg border bg-white">
            {[
              { id: 11, title: 'Bulaşık makinesi su kaçırıyor', customer: 'A. Yılmaz', status: 'Yeni', date: 'Bugün' },
              { id: 12, title: 'Fırın ısınmıyor', customer: 'M. Demir', status: 'Teklif Gönderildi', date: 'Dün' },
            ].map((j) => (
              <div key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-xs text-gray-500">Müşteri: {j.customer} • {j.date}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">{j.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1.5 rounded-md border hover:bg-gray-50">Detay</button>
                  <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">Mesaj Gönder</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-lg font-semibold mb-3">Profil Kontrolleri</h2>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-gray-500">Firma</div>
            <div className="font-medium mb-2">Demo Servis</div>
            <div className="text-sm text-gray-500">E-posta</div>
            <div className="font-medium mb-4">servis@demo.com</div>
            <a href="#/auth/service" className="px-3 py-1.5 rounded-md border hover:bg-gray-50 inline-block">Profili Düzenle</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
