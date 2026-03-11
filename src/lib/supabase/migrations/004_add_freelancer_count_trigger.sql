-- Create function to update freelancer count
CREATE OR REPLACE FUNCTION update_freelancer_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the freelancer count for the domain
  UPDATE domains 
  SET freelancer_count = (
    SELECT COUNT(*) 
    FROM freelancers 
    WHERE freelancers.domain_id = domains.id
  )
  WHERE id IN (
    SELECT domain_id FROM freelancers WHERE domain_id = NEW.domain_id
    UNION
    SELECT domain_id FROM freelancers WHERE domain_id = OLD.domain_id
    UNION
    SELECT domain_id FROM freelancers WHERE domain_id = NEW.domain_id
  );
  
  -- Also handle case where domain_id is set to null
  IF OLD.domain_id IS NOT NULL AND (NEW.domain_id IS DISTINCT FROM OLD.domain_id) THEN
    UPDATE domains 
    SET freelancer_count = (
      SELECT COUNT(*) 
      FROM freelancers 
      WHERE freelancers.domain_id = domains.id
    )
    WHERE id = OLD.domain_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS freelancer_count_insert ON freelancers;
CREATE TRIGGER freelancer_count_insert
AFTER INSERT ON freelancers
FOR EACH ROW
EXECUTE FUNCTION update_freelancer_count();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS freelancer_count_update ON freelancers;
CREATE TRIGGER freelancer_count_update
AFTER UPDATE ON freelancers
FOR EACH ROW
EXECUTE FUNCTION update_freelancer_count();

-- Create trigger for DELETE
DROP TRIGGER IF EXISTS freelancer_count_delete ON freelancers;
CREATE TRIGGER freelancer_count_delete
AFTER DELETE ON freelancers
FOR EACH ROW
EXECUTE FUNCTION update_freelancer_count();

-- Initial count update for all domains
UPDATE domains 
SET freelancer_count = (
  SELECT COUNT(*) 
  FROM freelancers 
  WHERE freelancers.domain_id = domains.id
);
