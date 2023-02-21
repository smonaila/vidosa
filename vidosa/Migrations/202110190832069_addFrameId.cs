namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addFrameId : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.ConnectionIds", "FrameId", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.ConnectionIds", "FrameId");
        }
    }
}
