/* eslint-disable no-console */
import { PrismaClient, TripStatus } from '@prisma/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLES,
  generateSeatLayout,
  countSeats,
  listSeatNumbers,
  type SeatLayout,
} from '@starline/shared';
import * as bcrypt from 'bcryptjs';
import { addDays, dhakaDateTime, serviceDateValue, todayDhaka } from '../src/common/time';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'StarLine123!';

// ------------------------------------------------------------------ fixtures

const BRANCHES = [
  { name: 'Dhaka Branch', code: 'DHK', district: 'Dhaka', division: 'Dhaka', address: 'Sayedabad Bus Terminal, Dhaka' },
  { name: 'Feni Branch', code: 'FEN', district: 'Feni', division: 'Chattogram', address: 'Mohipal, Feni' },
  { name: 'Chattogram Branch', code: 'CTG', district: 'Chattogram', division: 'Chattogram', address: 'Dampara, Chattogram' },
  { name: "Cox's Bazar Branch", code: 'CXB', district: "Cox's Bazar", division: 'Chattogram', address: "Jhautola, Cox's Bazar" },
  { name: 'Cumilla Branch', code: 'CML', district: 'Cumilla', division: 'Chattogram', address: 'Cantonment Road, Cumilla' },
  { name: 'Noakhali Branch', code: 'NOA', district: 'Noakhali', division: 'Chattogram', address: 'Maijdee Court, Noakhali' },
  { name: 'Sylhet Branch', code: 'SYL', district: 'Sylhet', division: 'Sylhet', address: 'Kadamtali, Sylhet' },
  { name: 'Daudkandi Branch', code: 'DKD', district: 'Cumilla', division: 'Chattogram', address: 'Daudkandi Bridge, Cumilla' },
  { name: 'Chandpur Branch', code: 'CHP', district: 'Chandpur', division: 'Chattogram', address: 'Kalibari, Chandpur' },
  { name: 'Lakshmipur Branch', code: 'LKP', district: 'Lakshmipur', division: 'Chattogram', address: 'Jhumur More, Lakshmipur' },
];

interface StopSeed {
  name: string;
  lat: number;
  lng: number;
}

const CITY: Record<string, StopSeed> = {
  Dhaka: { name: 'Dhaka (Sayedabad)', lat: 23.7104, lng: 90.4274 },
  Daudkandi: { name: 'Daudkandi', lat: 23.532, lng: 90.71 },
  Cumilla: { name: 'Cumilla', lat: 23.4607, lng: 91.1809 },
  Feni: { name: 'Feni (Mohipal)', lat: 23.0159, lng: 91.3976 },
  Sitakunda: { name: 'Sitakunda', lat: 22.6203, lng: 91.6541 },
  Chattogram: { name: 'Chattogram (Dampara)', lat: 22.3569, lng: 91.7832 },
  CoxsBazar: { name: "Cox's Bazar", lat: 21.4272, lng: 92.0058 },
  Choumuhani: { name: 'Choumuhani', lat: 22.934, lng: 91.115 },
  Maijdee: { name: 'Noakhali (Maijdee)', lat: 22.8724, lng: 91.0973 },
  Narsingdi: { name: 'Narsingdi', lat: 23.9193, lng: 90.7176 },
  Bhairab: { name: 'Bhairab', lat: 24.0524, lng: 90.9764 },
  Habiganj: { name: 'Habiganj', lat: 24.3745, lng: 91.4155 },
  Sylhet: { name: 'Sylhet (Kadamtali)', lat: 24.8949, lng: 91.8687 },
  Chandpur: { name: 'Chandpur', lat: 23.2333, lng: 90.671 },
  Lohagara: { name: 'Lohagara', lat: 22.0245, lng: 92.0965 },
};

const ROUTE_SEEDS = [
  { code: 'DHK-FEN', origin: 'Dhaka', destination: 'Feni', distanceKm: 151, durationMin: 240, fare: 650, stops: [CITY.Dhaka, CITY.Daudkandi, CITY.Cumilla, CITY.Feni] },
  { code: 'FEN-DHK', origin: 'Feni', destination: 'Dhaka', distanceKm: 151, durationMin: 240, fare: 650, stops: [CITY.Feni, CITY.Cumilla, CITY.Daudkandi, CITY.Dhaka] },
  { code: 'DHK-CTG', origin: 'Dhaka', destination: 'Chattogram', distanceKm: 264, durationMin: 390, fare: 900, stops: [CITY.Dhaka, CITY.Daudkandi, CITY.Cumilla, CITY.Feni, CITY.Sitakunda, CITY.Chattogram] },
  { code: 'CTG-DHK', origin: 'Chattogram', destination: 'Dhaka', distanceKm: 264, durationMin: 390, fare: 900, stops: [CITY.Chattogram, CITY.Sitakunda, CITY.Feni, CITY.Cumilla, CITY.Daudkandi, CITY.Dhaka] },
  { code: 'DHK-CXB', origin: 'Dhaka', destination: "Cox's Bazar", distanceKm: 414, durationMin: 600, fare: 1400, stops: [CITY.Dhaka, CITY.Cumilla, CITY.Feni, CITY.Chattogram, CITY.Lohagara, CITY.CoxsBazar] },
  { code: 'FEN-CTG', origin: 'Feni', destination: 'Chattogram', distanceKm: 113, durationMin: 150, fare: 350, stops: [CITY.Feni, CITY.Sitakunda, CITY.Chattogram] },
  { code: 'DHK-NOA', origin: 'Dhaka', destination: 'Noakhali', distanceKm: 190, durationMin: 300, fare: 700, stops: [CITY.Dhaka, CITY.Daudkandi, CITY.Cumilla, CITY.Choumuhani, CITY.Maijdee] },
  { code: 'NOA-DHK', origin: 'Noakhali', destination: 'Dhaka', distanceKm: 190, durationMin: 300, fare: 700, stops: [CITY.Maijdee, CITY.Choumuhani, CITY.Cumilla, CITY.Daudkandi, CITY.Dhaka] },
  { code: 'DHK-SYL', origin: 'Dhaka', destination: 'Sylhet', distanceKm: 240, durationMin: 330, fare: 800, stops: [CITY.Dhaka, CITY.Narsingdi, CITY.Bhairab, CITY.Habiganj, CITY.Sylhet] },
  { code: 'CTG-CXB', origin: 'Chattogram', destination: "Cox's Bazar", distanceKm: 150, durationMin: 210, fare: 500, stops: [CITY.Chattogram, CITY.Lohagara, CITY.CoxsBazar] },
];

const SCHEDULE_TIMES = ['06:00', '08:30', '12:00', '16:30', '22:30'];
/** Only these produce seeded trips (keeps the trip count at exactly 100). */
const TRIP_TIMES = ['08:30', '16:30'];

const FIRST_NAMES = ['Rahim', 'Karim', 'Fatema', 'Ayesha', 'Sumon', 'Nasrin', 'Jahid', 'Rubel', 'Shakila', 'Mizan', 'Rasel', 'Taslima', 'Farhan', 'Nusrat', 'Imran', 'Sadia', 'Arif', 'Moushumi', 'Tanvir', 'Shirin'];
const LAST_NAMES = ['Uddin', 'Ahmed', 'Begum', 'Hossain', 'Islam', 'Akter', 'Rahman', 'Khan', 'Chowdhury', 'Mia'];
const bdName = (i: number) => `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`;

const BUS_BRANDS = [
  { brand: 'Hino', model: 'AK1J' },
  { brand: 'Hyundai', model: 'Universe' },
  { brand: 'Scania', model: 'K360' },
  { brand: 'Ashok Leyland', model: '12M' },
];

// --------------------------------------------------------------------- main

async function main() {
  const today = todayDhaka();
  console.log(`Seeding Star Line data (today in Dhaka: ${today})…`);

  // Wipe in dependency order so the seed is re-runnable.
  await prisma.payment.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.gpsLocationHistory.deleteMany();
  await prisma.busLocation.deleteMany();
  await prisma.gpsSession.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.passengerProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();

  // ----------------------------------------------------- RBAC
  const permissionRows = await Promise.all(
    PERMISSION_DEFINITIONS.map((p) =>
      prisma.permission.create({ data: { code: p.code, group: p.group, description: p.description } }),
    ),
  );
  const permByCode = new Map(permissionRows.map((p) => [p.code, p.id]));

  const roleIds = new Map<string, string>();
  for (const roleName of Object.values(ROLES)) {
    const role = await prisma.role.create({
      data: {
        name: roleName,
        description: `${roleName.replaceAll('_', ' ')} (system role)`,
        isSystem: true,
        permissions: {
          create: DEFAULT_ROLE_PERMISSIONS[roleName].map((code) => ({
            permissionId: permByCode.get(code)!,
          })),
        },
      },
    });
    roleIds.set(roleName, role.id);
  }
  console.log(`  roles: ${roleIds.size}, permissions: ${permissionRows.length}`);

  // ----------------------------------------------------- branches
  const branches = [];
  for (const b of BRANCHES) {
    branches.push(
      await prisma.branch.create({
        data: { ...b, phone: `+88018800000${String(branches.length + 1).padStart(2, '0')}` },
      }),
    );
  }

  // ----------------------------------------------------- staff users
  const pw = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staff = async (
    name: string,
    email: string,
    roleName: string,
    branchId: string | null,
    employeeCode: string,
    phone?: string,
  ) =>
    prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash: pw,
        roleId: roleIds.get(roleName)!,
        branchId,
        staffProfile: { create: { employeeCode } },
      },
    });

  const superAdmin = await staff('Shahriar Alam', 'super@starline.local', ROLES.SUPER_ADMIN, null, 'EMP-0001');
  const admin = await staff('Mahmudul Hasan', 'admin@starline.local', ROLES.ADMIN, null, 'EMP-0002');
  await staff('Tania Rahman', 'ops@starline.local', ROLES.OPERATIONS_MANAGER, null, 'EMP-0003');
  const branchManager = await staff('Kamrul Islam', 'branch@starline.local', ROLES.BRANCH_MANAGER, branches[0].id, 'EMP-0004');
  await prisma.branch.update({ where: { id: branches[0].id }, data: { managerId: branchManager.id } });
  const ticketerDemo = await staff('Rina Akter', 'ticket@starline.local', ROLES.TICKETER, branches[0].id, 'EMP-0005');

  const drivers = [
    await staff('Abdul Malek', 'driver@starline.local', ROLES.DRIVER, branches[0].id, 'DRV-0001', '+8801811000001'),
  ];
  for (let i = 2; i <= 10; i++) {
    drivers.push(
      await staff(`${bdName(i + 40)} (Driver)`, `driver${i}@starline.local`, ROLES.DRIVER, branches[(i - 1) % branches.length].id, `DRV-${String(i).padStart(4, '0')}`, `+88018110000${String(i).padStart(2, '0')}`),
    );
  }
  const supervisors = [
    await staff('Jashim Uddin', 'supervisor@starline.local', ROLES.SUPERVISOR, branches[0].id, 'SUP-0001', '+8801812000001'),
  ];
  for (let i = 2; i <= 10; i++) {
    supervisors.push(
      await staff(`${bdName(i + 60)} (Supervisor)`, `supervisor${i}@starline.local`, ROLES.SUPERVISOR, branches[(i - 1) % branches.length].id, `SUP-${String(i).padStart(4, '0')}`, `+88018120000${String(i).padStart(2, '0')}`),
    );
  }
  const helpers = [
    await staff('Selim Reza', 'helper@starline.local', ROLES.HELPER, branches[0].id, 'HLP-0001', '+8801813000001'),
  ];
  for (let i = 2; i <= 10; i++) {
    helpers.push(
      await staff(`${bdName(i + 80)} (Helper)`, `helper${i}@starline.local`, ROLES.HELPER, branches[(i - 1) % branches.length].id, `HLP-${String(i).padStart(4, '0')}`, `+88018130000${String(i).padStart(2, '0')}`),
    );
  }
  for (let i = 2; i <= 3; i++) {
    await staff(`${bdName(i + 15)} (Ticketer)`, `ticket${i}@starline.local`, ROLES.TICKETER, branches[i - 1].id, `TKT-${String(i).padStart(4, '0')}`);
  }
  console.log('  staff users created (demo password for all: StarLine123!)');

  // ----------------------------------------------------- passengers
  const passengerRole = roleIds.get(ROLES.PASSENGER)!;
  const demoPassenger = await prisma.user.create({
    data: {
      name: 'Sakib Hasan',
      phone: '+8801711111111',
      roleId: passengerRole,
      passengerProfile: { create: {} },
    },
  });
  const passengers = [demoPassenger];
  for (let i = 1; i < 100; i++) {
    passengers.push(
      await prisma.user.create({
        data: {
          name: bdName(i),
          phone: `+88017${String(20000000 + i)}`,
          roleId: passengerRole,
          passengerProfile: { create: {} },
        },
      }),
    );
  }

  // ----------------------------------------------------- buses
  const layout40 = generateSeatLayout('2+2', 10);
  const layout30 = generateSeatLayout('2+1', 10);
  const buses = [];
  for (let i = 0; i < 30; i++) {
    const ac = i % 2 === 0;
    const layout: SeatLayout = ac ? layout30 : layout40;
    const spec = BUS_BRANDS[i % BUS_BRANDS.length];
    buses.push(
      await prisma.bus.create({
        data: {
          busNumber: `SL-${101 + i}`,
          registrationNumber: `DHAKA METRO-B ${11 + Math.floor(i / 10)}-${String(1000 + i)}`,
          brand: spec.brand,
          model: spec.model,
          category: ac ? 'AC' : 'NON_AC',
          serviceType: ac ? 'Business Class' : 'Economy Class',
          seatCapacity: countSeats(layout),
          seatLayout: layout as unknown as object,
          status: 'IDLE',
          branchId: branches[i % branches.length].id,
        },
      }),
    );
  }

  // ----------------------------------------------------- routes + schedules
  const routes = [];
  const schedulesByRoute = new Map<string, { id: string; departureTime: string }[]>();
  for (const seed of ROUTE_SEEDS) {
    const route = await prisma.route.create({
      data: {
        name: `${seed.origin} → ${seed.destination}`,
        code: seed.code,
        origin: seed.origin,
        destination: seed.destination,
        distanceKm: seed.distanceKm,
        estimatedDurationMin: seed.durationMin,
        baseFareBdt: seed.fare,
        stops: {
          create: seed.stops.map((s, idx) => ({
            name: s.name,
            order: idx,
            lat: s.lat,
            lng: s.lng,
          })),
        },
      },
    });
    routes.push(route);
    const scheds = [];
    for (const time of SCHEDULE_TIMES) {
      const s = await prisma.schedule.create({
        data: {
          routeId: route.id,
          departureTime: time,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          fareBdt: null,
        },
      });
      scheds.push({ id: s.id, departureTime: time });
    }
    schedulesByRoute.set(route.id, scheds);
  }
  console.log(`  branches: ${branches.length}, buses: ${buses.length}, routes: ${routes.length}, schedules: ${routes.length * SCHEDULE_TIMES.length}`);

  // ----------------------------------------------------- trips (−2 … +2 days)
  const trips: { id: string; routeIdx: number; date: string; time: string; busId: string; fare: number }[] = [];
  for (let day = -2; day <= 2; day++) {
    const date = addDays(today, day);
    for (let r = 0; r < routes.length; r++) {
      for (let slot = 0; slot < TRIP_TIMES.length; slot++) {
        const time = TRIP_TIMES[slot];
        const schedule = schedulesByRoute.get(routes[r].id)!.find((s) => s.departureTime === time)!;
        const bus = buses[(r * 2 + slot) % buses.length];
        const status: TripStatus = day < 0 ? 'COMPLETED' : 'SCHEDULED';
        const trip = await prisma.trip.create({
          data: {
            routeId: routes[r].id,
            scheduleId: schedule.id,
            serviceDate: serviceDateValue(date),
            departureAt: dhakaDateTime(date, time),
            status,
            fareBdt: ROUTE_SEEDS[r].fare,
            busId: bus.id,
            driverId: drivers[r % drivers.length].id,
            supervisorId: supervisors[r % supervisors.length].id,
            helperId: helpers[r % helpers.length].id,
            branchId: branches[r % branches.length].id,
            ...(day < 0 ? { arrivedAt: dhakaDateTime(date, '23:00') } : {}),
          },
        });
        trips.push({ id: trip.id, routeIdx: r, date, time, busId: bus.id, fare: ROUTE_SEEDS[r].fare });
      }
    }
  }
  console.log(`  trips: ${trips.length}`);

  // ----------------------------------------------------- bookings
  const seatNumbersByBus = new Map<string, string[]>();
  for (const bus of buses) {
    seatNumbersByBus.set(bus.id, listSeatNumbers((bus.seatLayout as unknown as SeatLayout)!));
  }
  const takenSeatsByTrip = new Map<string, Set<string>>();
  const takeSeats = (trip: { id: string; busId: string }, count: number): string[] => {
    const all = seatNumbersByBus.get(trip.busId) ?? [];
    const taken = takenSeatsByTrip.get(trip.id) ?? new Set<string>();
    const out: string[] = [];
    for (const seat of all) {
      if (out.length === count) break;
      if (!taken.has(seat)) {
        taken.add(seat);
        out.push(seat);
      }
    }
    takenSeatsByTrip.set(trip.id, taken);
    return out;
  };

  const bookable = trips.filter((t) => t.date === today || t.date === addDays(today, 1));
  let bookingSerial = 100001;
  const createBooking = async (
    passengerId: string,
    trip: (typeof trips)[number],
    seatCount: number,
    bookedById: string | null,
  ) => {
    const seats = takeSeats(trip, seatCount);
    if (seats.length === 0) return null;
    return prisma.booking.create({
      data: {
        code: `SL${bookingSerial++}`,
        tripId: trip.id,
        passengerId,
        bookedById,
        status: 'CONFIRMED',
        fareTotalBdt: trip.fare * seats.length,
        boardingPoint: ROUTE_SEEDS[trip.routeIdx].stops[0].name,
        seats: { create: seats.map((seatNumber) => ({ seatNumber, tripId: trip.id })) },
        payment: { create: { amountBdt: trip.fare * seats.length, method: 'CASH', status: 'PAID' } },
      },
    });
  };

  // Demo passenger rides today's Dhaka → Feni 08:30 — the same trip the demo
  // driver (driver@starline.local) drives. Perfect end-to-end test pair.
  const demoTrip = trips.find((t) => t.routeIdx === 0 && t.date === today && t.time === '08:30')!;
  await createBooking(demoPassenger.id, demoTrip, 2, ticketerDemo.id);

  let bookingCount = 1;
  for (let i = 1; i < 100; i++) {
    const trip = bookable[i % bookable.length];
    const made = await createBooking(
      passengers[i].id,
      trip,
      1 + (i % 2),
      i % 3 === 0 ? ticketerDemo.id : null,
    );
    if (made) bookingCount++;
  }
  console.log(`  passengers: ${passengers.length}, bookings: ${bookingCount}`);

  // ----------------------------------------------------- settings & audit
  await prisma.systemSetting.create({
    data: {
      key: 'general',
      group: 'general',
      value: {
        companyName: 'Star Line',
        supportPhone: '+8801713000000',
        supportEmail: 'support@starlinegroupbd.com',
        defaultLocale: 'en',
      },
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: 'SEED_COMPLETED',
      entity: 'System',
      after: { branches: branches.length, buses: buses.length, routes: routes.length, trips: trips.length },
    },
  });

  console.log('\nDemo accounts (password: StarLine123!):');
  console.log('  super@starline.local / admin@starline.local / ops@starline.local');
  console.log('  branch@starline.local / ticket@starline.local');
  console.log('  driver@starline.local / supervisor@starline.local / helper@starline.local');
  console.log('Demo passenger: +8801711111111 (OTP sandbox code: 123456)');
  console.log(`Admin user for quick login: ${admin.email}`);
  console.log('\nSeed complete ✔');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
