export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      active_models: {
        Row: {
          activated_at: string | null;
          activated_by: string | null;
          horizon_minutes: number;
          id: string;
          model_name: string;
          model_run_id: string;
          model_version: string;
          notes: string | null;
        };
        Insert: {
          activated_at?: string | null;
          activated_by?: string | null;
          horizon_minutes: number;
          id?: string;
          model_name: string;
          model_run_id: string;
          model_version: string;
          notes?: string | null;
        };
        Update: {
          activated_at?: string | null;
          activated_by?: string | null;
          horizon_minutes?: number;
          id?: string;
          model_name?: string;
          model_run_id?: string;
          model_version?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      forecasts: {
        Row: {
          forecast_date: string;
          id: number;
          station_id: number;
          target_date: string;
          water_level: number | null;
        };
        Insert: {
          forecast_date: string;
          id?: number;
          station_id: number;
          target_date: string;
          water_level?: number | null;
        };
        Update: {
          forecast_date?: string;
          id?: number;
          station_id?: number;
          target_date?: string;
          water_level?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "forecasts_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      model_performance: {
        Row: {
          accuracy: number | null;
          evaluated_at: string | null;
          id: string;
          mae: number | null;
          mape: number | null;
          model_type: string;
          r2: number | null;
          rmse: number | null;
          station_id: number | null;
        };
        Insert: {
          accuracy?: number | null;
          evaluated_at?: string | null;
          id?: string;
          mae?: number | null;
          mape?: number | null;
          model_type: string;
          r2?: number | null;
          rmse?: number | null;
          station_id?: number | null;
        };
        Update: {
          accuracy?: number | null;
          evaluated_at?: string | null;
          id?: string;
          mae?: number | null;
          mape?: number | null;
          model_type?: string;
          r2?: number | null;
          rmse?: number | null;
          station_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "model_performance_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      preprocessing_configs: {
        Row: {
          config: Json;
          enabled: boolean | null;
          id: string;
          method_id: string;
          updated_at: string | null;
        };
        Insert: {
          config?: Json;
          enabled?: boolean | null;
          id?: string;
          method_id: string;
          updated_at?: string | null;
        };
        Update: {
          config?: Json;
          enabled?: boolean | null;
          id?: string;
          method_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          id?: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          id?: number;
          permission?: Database["public"]["Enums"]["app_permission"];
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      station_measurements: {
        Row: {
          created_at: string;
          fetched_at: string | null;
          flow_rate: number | null;
          id: number;
          measured_at: string;
          rainfall: number | null;
          rainfall_12h: number | null;
          rainfall_1h: number | null;
          rainfall_24h: number | null;
          rainfall_6h: number | null;
          rainfall_7to7: number | null;
          source: string | null;
          station_id: number;
          status: string | null;
          unit: string | null;
          water_level: number | null;
        };
        Insert: {
          created_at?: string;
          fetched_at?: string | null;
          flow_rate?: number | null;
          id?: number;
          measured_at: string;
          rainfall?: number | null;
          rainfall_12h?: number | null;
          rainfall_1h?: number | null;
          rainfall_24h?: number | null;
          rainfall_6h?: number | null;
          rainfall_7to7?: number | null;
          source?: string | null;
          station_id: number;
          status?: string | null;
          unit?: string | null;
          water_level?: number | null;
        };
        Update: {
          created_at?: string;
          fetched_at?: string | null;
          flow_rate?: number | null;
          id?: number;
          measured_at?: string;
          rainfall?: number | null;
          rainfall_12h?: number | null;
          rainfall_1h?: number | null;
          rainfall_24h?: number | null;
          rainfall_6h?: number | null;
          rainfall_7to7?: number | null;
          source?: string | null;
          station_id?: number;
          status?: string | null;
          unit?: string | null;
          water_level?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "station_measurements_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      station_model_configs: {
        Row: {
          config: Json;
          id: string;
          model_type: string;
          station_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          config?: Json;
          id?: string;
          model_type: string;
          station_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          config?: Json;
          id?: string;
          model_type?: string;
          station_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "station_model_configs_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      stations: {
        Row: {
          alarm_level: number | null;
          country: string | null;
          created_at: string;
          flood_level: number | null;
          id: number;
          is_deleted: boolean | null;
          latitude: number;
          longitude: number;
          name: string;
          region: string | null;
          river: string | null;
          station_code: string;
        };
        Insert: {
          alarm_level?: number | null;
          country?: string | null;
          created_at?: string;
          flood_level?: number | null;
          id?: number;
          is_deleted?: boolean | null;
          latitude: number;
          longitude: number;
          name: string;
          region?: string | null;
          river?: string | null;
          station_code: string;
        };
        Update: {
          alarm_level?: number | null;
          country?: string | null;
          created_at?: string;
          flood_level?: number | null;
          id?: number;
          is_deleted?: boolean | null;
          latitude?: number;
          longitude?: number;
          name?: string;
          region?: string | null;
          river?: string | null;
          station_code?: string;
        };
        Relationships: [];
      };
      sync_logs: {
        Row: {
          details: Json | null;
          error_count: number | null;
          id: string;
          success_count: number | null;
          synced_at: string;
        };
        Insert: {
          details?: Json | null;
          error_count?: number | null;
          id?: string;
          success_count?: number | null;
          synced_at?: string;
        };
        Update: {
          details?: Json | null;
          error_count?: number | null;
          id?: string;
          success_count?: number | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: number;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: number;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: number;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          status: Database["public"]["Enums"]["user_status"];
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          status?: Database["public"]["Enums"]["user_status"];
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["user_status"];
        };
        Relationships: [];
      };
      weather_measurements: {
        Row: {
          clouds: number | null;
          created_at: string;
          feels_like: number | null;
          humidity: number | null;
          id: number;
          measured_at: string;
          pressure: number | null;
          rain_1h: number | null;
          station_id: number;
          temp_max: number | null;
          temp_min: number | null;
          temperature: number | null;
          visibility: number | null;
          weather_description: string | null;
          weather_main: string | null;
          wind_deg: number | null;
          wind_speed: number | null;
        };
        Insert: {
          clouds?: number | null;
          created_at?: string;
          feels_like?: number | null;
          humidity?: number | null;
          id?: number;
          measured_at: string;
          pressure?: number | null;
          rain_1h?: number | null;
          station_id: number;
          temp_max?: number | null;
          temp_min?: number | null;
          temperature?: number | null;
          visibility?: number | null;
          weather_description?: string | null;
          weather_main?: string | null;
          wind_deg?: number | null;
          wind_speed?: number | null;
        };
        Update: {
          clouds?: number | null;
          created_at?: string;
          feels_like?: number | null;
          humidity?: number | null;
          id?: number;
          measured_at?: string;
          pressure?: number | null;
          rain_1h?: number | null;
          station_id?: number;
          temp_max?: number | null;
          temp_min?: number | null;
          temperature?: number | null;
          visibility?: number | null;
          weather_description?: string | null;
          weather_main?: string | null;
          wind_deg?: number | null;
          wind_speed?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "weather_measurements_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"];
          user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_permission:
        | "users.manage"
        | "data.manage"
        | "models.tune"
        | "data.download";
      app_role: "admin" | "data_scientist";
      user_status: "pending" | "active" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permission: [
        "users.manage",
        "data.manage",
        "models.tune",
        "data.download",
      ],
      app_role: ["admin", "data_scientist"],
      user_status: ["pending", "active", "rejected"],
    },
  },
} as const;

// Schema: graphql_public
// Functions
export type ArgsGraphql =
  Database["graphql_public"]["Functions"]["graphql"]["Args"];
export type ReturnTypeGraphql =
  Database["graphql_public"]["Functions"]["graphql"]["Returns"];

// Schema: public
// Enums
export enum AppPermission {
  usersManage = "users.manage",
  dataManage = "data.manage",
  modelsTune = "models.tune",
  dataDownload = "data.download",
}

export enum AppRole {
  admin = "admin",
  data_scientist = "data_scientist",
}

export enum UserStatus {
  pending = "pending",
  active = "active",
  rejected = "rejected",
}

// Tables
export type ActiveModels = Database["public"]["Tables"]["active_models"]["Row"];
export type InsertActiveModels =
  Database["public"]["Tables"]["active_models"]["Insert"];
export type UpdateActiveModels =
  Database["public"]["Tables"]["active_models"]["Update"];

export type Forecasts = Database["public"]["Tables"]["forecasts"]["Row"];
export type InsertForecasts =
  Database["public"]["Tables"]["forecasts"]["Insert"];
export type UpdateForecasts =
  Database["public"]["Tables"]["forecasts"]["Update"];

export type ModelPerformance =
  Database["public"]["Tables"]["model_performance"]["Row"];
export type InsertModelPerformance =
  Database["public"]["Tables"]["model_performance"]["Insert"];
export type UpdateModelPerformance =
  Database["public"]["Tables"]["model_performance"]["Update"];

export type PreprocessingConfigs =
  Database["public"]["Tables"]["preprocessing_configs"]["Row"];
export type InsertPreprocessingConfigs =
  Database["public"]["Tables"]["preprocessing_configs"]["Insert"];
export type UpdatePreprocessingConfigs =
  Database["public"]["Tables"]["preprocessing_configs"]["Update"];

export type RolePermissions =
  Database["public"]["Tables"]["role_permissions"]["Row"];
export type InsertRolePermissions =
  Database["public"]["Tables"]["role_permissions"]["Insert"];
export type UpdateRolePermissions =
  Database["public"]["Tables"]["role_permissions"]["Update"];

export type StationMeasurements =
  Database["public"]["Tables"]["station_measurements"]["Row"];
export type InsertStationMeasurements =
  Database["public"]["Tables"]["station_measurements"]["Insert"];
export type UpdateStationMeasurements =
  Database["public"]["Tables"]["station_measurements"]["Update"];

export type StationModelConfigs =
  Database["public"]["Tables"]["station_model_configs"]["Row"];
export type InsertStationModelConfigs =
  Database["public"]["Tables"]["station_model_configs"]["Insert"];
export type UpdateStationModelConfigs =
  Database["public"]["Tables"]["station_model_configs"]["Update"];

export type Stations = Database["public"]["Tables"]["stations"]["Row"];
export type InsertStations = Database["public"]["Tables"]["stations"]["Insert"];
export type UpdateStations = Database["public"]["Tables"]["stations"]["Update"];

export type SyncLogs = Database["public"]["Tables"]["sync_logs"]["Row"];
export type InsertSyncLogs =
  Database["public"]["Tables"]["sync_logs"]["Insert"];
export type UpdateSyncLogs =
  Database["public"]["Tables"]["sync_logs"]["Update"];

export type UserRoles = Database["public"]["Tables"]["user_roles"]["Row"];
export type InsertUserRoles =
  Database["public"]["Tables"]["user_roles"]["Insert"];
export type UpdateUserRoles =
  Database["public"]["Tables"]["user_roles"]["Update"];

export type Users = Database["public"]["Tables"]["users"]["Row"];
export type InsertUsers = Database["public"]["Tables"]["users"]["Insert"];
export type UpdateUsers = Database["public"]["Tables"]["users"]["Update"];

export type WeatherMeasurements =
  Database["public"]["Tables"]["weather_measurements"]["Row"];
export type InsertWeatherMeasurements =
  Database["public"]["Tables"]["weather_measurements"]["Insert"];
export type UpdateWeatherMeasurements =
  Database["public"]["Tables"]["weather_measurements"]["Update"];

// Functions
export type ArgsAuthorize =
  Database["public"]["Functions"]["authorize"]["Args"];
export type ReturnTypeAuthorize =
  Database["public"]["Functions"]["authorize"]["Returns"];
