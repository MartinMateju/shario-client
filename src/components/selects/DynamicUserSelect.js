import TextInput from "../inputs/TextInput";

export default function DynamicUserSelect({
  title,
  label,
  names = [],
  onChange,
  addUser,
  deleteUser,
}) {
  return (
    <>
      <div className="pt-2 space-y-2">
        <label className="text-base font-medium text-gray-900">{label}</label>
        <button
          className="py-1 ring-1 ring-gray-700 shadow-sm font-medium text-sm px-10 justify-center w-full flex text-gray-900 hover:ring-2 hover:ring-black hover:text-gray-900"
          type="button"
          value="Add User"
          onClick={addUser}
        >
          {title}
        </button>
      </div>
      {names.map((e, idx) => {
        const firstnameId = `firstname-${idx}`;
        const lastnameId = `lastname-${idx}`;
        return (
          <div className="border-b" key={idx}>
            <div className="sm:grid-cols-6 gap-x-6 grid py-2" key={idx}>
              <TextInput
                htmlFor={firstnameId}
                key={firstnameId}
                name={"firstname"}
                label={`Jméno`}
                id={firstnameId}
                data={idx}
                value={names[idx].firstname}
                callback={onChange}
                autoComplete="off"
                className={"sm:col-span-3"}
              />
              <TextInput
                htmlFor={lastnameId}
                key={lastnameId}
                name={"lastname"}
                label={`Přijmení`}
                id={lastnameId}
                data={idx}
                value={names[idx].lastname}
                callback={onChange}
                autoComplete="off"
                className={"sm:col-span-3"}
              />
            </div>
            <div className="flex justify-end">
              <button
                className="pb-2 font-medium text-sm text-red-600 hover:text-red-400"
                type="button"
                onClick={() => deleteUser(idx)}
              >
                Odebrat
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
