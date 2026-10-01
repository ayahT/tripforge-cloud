import { motion } from 'framer-motion';
import VehicleVisibilityMatrix from '@/components/superadmin/VehicleVisibilityMatrix';

const Assignments = () => {
  return (
    <div className="space-y-8 max-w-[1200px]">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VehicleVisibilityMatrix />
      </motion.div>
    </div>
  );
};

export default Assignments;
