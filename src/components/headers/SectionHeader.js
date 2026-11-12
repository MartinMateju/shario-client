export default function SectionHeader({ text }) {
  return (
    <div className="pt-11  grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-1 gap-4 lg:col-span-2">
        <section aria-labelledby="section-1-title">
          <div className="overflow-hidden rounded-none bg-white shadow">
            <p className="text-xl p-4 text-center font-medium leading-7 text-gray-600">
              {text}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
