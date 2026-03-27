type BaseProps = {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
};

type InputProps = BaseProps & {
  type?: "text" | "number" | "email" | "url" | "password" | "color";
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  maxLength?: number;
  min?: number;
  step?: number;
};

type TextareaProps = BaseProps & {
  type: "textarea";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
};

type SelectProps = BaseProps & {
  type: "select";
  value: string | number;
  onChange: (val: string) => void;
  options: { value: string | number; label: string }[];
  emptyLabel?: string;
};

type Props = InputProps | TextareaProps | SelectProps;

export default function FormField(props: Props) {
  const { label, hint, required, error } = props;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input */}
      {(!props.type || ["text","number","email","url","password","color"].includes(props.type as string)) && (
        <div className="relative flex items-center">
          {(props as InputProps).prefix && (
            <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
              {(props as InputProps).prefix}
            </span>
          )}
          <input
            type={(props as InputProps).type ?? "text"}
            value={(props as InputProps).value}
            onChange={(e) => (props as InputProps).onChange(e.target.value)}
            placeholder={(props as InputProps).placeholder}
            maxLength={(props as InputProps).maxLength}
            min={(props as InputProps).min}
            step={(props as InputProps).step}
            className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition
              ${(props as InputProps).prefix ? "rounded-r-lg border-gray-300" : "rounded-lg border-gray-300"}
              ${(props as InputProps).suffix ? "pr-8" : ""}
              ${error ? "border-red-400 focus:ring-red-400" : "border-gray-300"}
            `}
          />
          {(props as InputProps).suffix && (
            <span className="absolute right-3 text-gray-400 text-sm">
              {(props as InputProps).suffix}
            </span>
          )}
        </div>
      )}

      {/* Textarea */}
      {props.type === "textarea" && (
        <textarea
          value={(props as TextareaProps).value}
          onChange={(e) => (props as TextareaProps).onChange(e.target.value)}
          placeholder={(props as TextareaProps).placeholder}
          rows={(props as TextareaProps).rows ?? 3}
          maxLength={(props as TextareaProps).maxLength}
          className={`w-full px-3 py-2 border text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition
            ${error ? "border-red-400" : "border-gray-300"}`}
        />
      )}

      {/* Select */}
      {props.type === "select" && (
        <select
          value={(props as SelectProps).value}
          onChange={(e) => (props as SelectProps).onChange(e.target.value)}
          className={`w-full px-3 py-2 border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition
            ${error ? "border-red-400" : "border-gray-300"}`}
        >
          {(props as SelectProps).emptyLabel && (
            <option value="">{(props as SelectProps).emptyLabel}</option>
          )}
          {(props as SelectProps).options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Hint / Error */}
      {error  && <p className="text-xs text-red-500">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
